import base64, importlib.util, json, tempfile, unittest, urllib.error, subprocess, sys, time
from pathlib import Path
spec=importlib.util.spec_from_file_location('worker',Path(__file__).with_name('worker.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class WorkerTests(unittest.TestCase):
 def setUp(self):
  scratch=mod.ROOT/'work/illustration-worker';scratch.mkdir(parents=True,exist_ok=True)
  self.temp=tempfile.TemporaryDirectory(dir=scratch);self.root=Path(self.temp.name)
  (self.root/'catalogue/exercises').mkdir(parents=True)
  (self.root/'assets/exercise-illustrations').mkdir(parents=True)
  self.write('catalogue/exercises/0001.json',{'id':'0001','name':'test fixture only','equipment':'body weight','target':'abs'})
  self.write('assets/exercise-illustrations/manifest.json',{'jobs':[]})
  self.write('assets/exercise-illustrations/style-policy.json',{'id':'test','prompt':'Fully opaque clothing'})
  self.w=mod.Worker(self.root/'runtime',self.root);self.w.sync()
  self.write('plans.json',{'jobs':[{'exerciseId':'0001','variant':v,'poses':[{'key':'p1','caption':'Hold','description':'Test fixture'}],'layout':{'columns':1,'rows':1},'techniqueNotes':'Test only','muscleNotes':'Review required'} for v in ('male','female')]})
  self.w.plan(self.root/'plans.json');self.w.control('paused','0')
  self.cfg={'reservePerRequestUSD':1,'maxRequests':10,'budgetUSD':5,'maxAttempts':2,'pricing':{'textInput':5,'imageInput':8,'imageOutput':30}}
  # Existing real artwork is reused only inside isolated test fixtures, never new production media.
  m=mod.read(mod.ROOT/'assets/exercise-illustrations/manifest.json')['jobs']
  self.images=[(mod.ROOT/j['master']['path']).read_bytes() for j in m[:2]];self.calls=0
 def write(self,p,o):mod.json_write(self.root/p,o)
 def tearDown(self):self.w.db.close();self.temp.cleanup()
 def provider(self,p,c):
  image=self.images[self.calls%2];self.calls+=1
  return {'data':[{'b64_json':base64.b64encode(image).decode()}],'usage':{'input_tokens_details':{'text_tokens':100,'image_tokens':0},'output_tokens':1000}}
 def test_full_two_variant_batch_and_resume(self):
  self.assertTrue(self.w.step(self.cfg,self.provider));self.assertTrue(self.w.step(self.cfg,self.provider));self.assertFalse(self.w.step(self.cfg,self.provider))
  self.w.export(self.root/'export.json');self.assertEqual(len(mod.read(self.root/'export.json')['jobs']),2)
  self.w.sync();self.assertEqual(self.w.report()['statuses'],{'generated':2});self.assertEqual(self.calls,2)
  self.assertAlmostEqual(self.w.report()['usageCalculatedUSD'],.061)
  self.assertEqual(self.w.report()['remaining'],0)
 def test_pause_and_budget_no_calls(self):
  self.w.control('paused','1');self.assertFalse(self.w.step(self.cfg,self.provider))
  self.w.control('paused','0');self.cfg['budgetUSD']=0;self.assertFalse(self.w.step(self.cfg,self.provider));self.assertEqual(self.calls,0)
 def test_duplicate_output_quarantined(self):
  self.w.step(self.cfg,self.provider);self.calls=0;self.w.step(self.cfg,self.provider)
  self.assertEqual(self.w.report()['statuses'],{'failed':1,'generated':1})
 def test_unknown_failure_does_not_retry(self):
  def timeout(*a):raise TimeoutError()
  self.w.step(self.cfg,timeout);self.w.control('paused','0')
  self.assertFalse(self.w.step(self.cfg,self.provider));self.assertEqual(self.calls,0)
 def test_receipt_recovers_after_db_interruption(self):
  original=self.w.finish
  def crash(*a):raise KeyboardInterrupt()
  self.w.finish=crash
  with self.assertRaises(KeyboardInterrupt): self.w.step(self.cfg,self.provider)
  self.w.finish=original;self.w.recover()
  self.assertEqual(self.w.report()['statuses'],{'generated':1,'pending':1});self.assertEqual(self.calls,1)
 def test_interrupted_request_without_receipt_quarantined(self):
  self.w.db.execute("INSERT INTO requests VALUES ('interrupted','0001:male','processing',1,NULL,NULL,NULL,0)")
  self.w.db.execute("UPDATE jobs SET status='processing' WHERE id='0001:male'");self.w.db.commit();self.w.recover()
  self.assertTrue(self.w.report()['paused']);self.assertEqual(self.w.report()['statuses']['failed'],1)
 def test_429_bounded_retry(self):
  def limited(*a):raise urllib.error.HTTPError('test',429,'rate limited',{'Retry-After':'1'},None)
  self.w.step(self.cfg,limited)
  self.assertEqual(self.w.report()['usageCalculatedUSD'],0)
  self.w.db.execute("UPDATE jobs SET next_at=0 WHERE id='0001:female'");self.w.db.commit()
  self.w.step(self.cfg,limited);self.assertEqual(self.w.report()['statuses']['failed'],1)
 def test_style_change_requires_replanning(self):
  self.write('assets/exercise-illustrations/style-policy.json',{'id':'changed','prompt':'new'})
  self.w.step(self.cfg,self.provider);self.assertEqual(self.calls,0);self.assertEqual(self.w.report()['ready'],1)
 def test_detached_worker_heartbeat_and_clean_stop(self):
  driver=self.root/'driver.py'
  driver.write_text("import importlib.util\nfrom pathlib import Path\n"+
   "s=importlib.util.spec_from_file_location('worker',"+repr(str(mod.ROOT/'scripts/illustrations/worker.py'))+");m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n"+
   "w=m.Worker(Path("+repr(str(self.w.home))+"),Path("+repr(str(self.root))+"))\n"+
   "w.control('paused','1')\nwith w.lock():w.run_loop({'intervalSeconds':1},lambda *args:None)\n")
  child=subprocess.Popen([sys.executable,str(driver)],start_new_session=True,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  try:
   deadline=time.monotonic()+5
   while not self.w.control('heartbeat') and time.monotonic()<deadline:time.sleep(.1)
   first=self.w.control('heartbeat');self.assertIsNotNone(first)
   time.sleep(1.2);self.assertNotEqual(first,self.w.control('heartbeat'));self.assertIsNone(child.poll())
   self.w.control('stop','1');self.assertEqual(child.wait(timeout=5),0);self.assertEqual(self.w.control('pid'),'')
  finally:
   if child.poll() is None:child.terminate();child.wait(timeout=5)
   child.stderr.close()
 def test_single_worker_lock(self):
  other=mod.Worker(self.root/'runtime',self.root)
  with self.w.lock():
   with self.assertRaises(RuntimeError):
    with other.lock():pass
  other.db.close()
if __name__=='__main__':unittest.main()
