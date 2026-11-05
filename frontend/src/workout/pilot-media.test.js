import {describe,it,expect,vi,afterEach} from 'vitest'
import {approvedVariant,selectedMediaUrls,downloadSelected} from './pilot-media.js'
const job=(variant,exerciseId='0868')=>({exerciseId,variant,review:{status:'approved',qualifiedReview:true,clothingReview:true,poseReview:true},assets:[{path:`/workout/illustration-approved/${variant}-p1.webp`}],poses:[{key:'p1'}],thumbnail:{path:`/workout/illustration-approved/${variant}-thumb.webp`}})
afterEach(()=>vi.unstubAllGlobals())
describe('illustration approval and selective offline media',()=>{
 it('serves explicitly user-authorized versions while anatomy review remains pending',()=>{
  const j=job('male');j.review={status:'pending'}
  j.publication={status:'user-authorized',masterHash:'a'.repeat(64),assetSignature:'b'.repeat(64)}
  expect(approvedVariant({'0868':{male:j}},'0868','male')).toBe(j)
  j.blockingIssues=['Incorrect movement'];expect(approvedVariant({'0868':{male:j}},'0868','male')).toBe(null)
  delete j.blockingIssues;j.publication.masterHash='stale';expect(approvedVariant({'0868':{male:j}},'0868','male')).toBe(null)
 })
 it('never serves generated, unreviewed or incomplete variants',()=>{
  const j=job('male');j.review.status='pending';expect(approvedVariant({'0868':{male:j}},'0868','male')).toBe(null)
  j.review.status='approved';j.assets=[];expect(approvedVariant({'0868':{male:j}},'0868','male')).toBe(null)
 })
 it('rejects artwork assigned to the wrong exercise or model',()=>{
  expect(approvedVariant({'0868':{male:job('male','0463')}},'0868','male')).toBe(null)
  expect(approvedVariant({'0868':{male:job('female')}},'0868','male')).toBe(null)
 })
 it('loads only selected existing IDs and model; never videos or masters',()=>{
  const index={'0868':{male:job('male'),female:job('female')},'0463':{male:job('male','0463')}}
  expect(selectedMediaUrls(index,['0868','0868','unknown'],'female')).toEqual(['/workout/illustration-approved/female-thumb.webp','/workout/illustration-approved/female-p1.webp'])
 })
 it('retries only missing files after an interrupted download',async()=>{
  const saved=new Map();const cache={match:vi.fn(u=>saved.get(u)),put:vi.fn((u,r)=>saved.set(u,r))}
  vi.stubGlobal('caches',{open:async()=>cache});const fetch=vi.fn().mockResolvedValueOnce({ok:true}).mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true});vi.stubGlobal('fetch',fetch)
  const index={'0868':{male:job('male')}}
  await expect(downloadSelected(index,['0868'],'male')).rejects.toThrow('Download failed')
  expect(await downloadSelected(index,['0868'],'male')).toBe(2);expect(fetch).toHaveBeenCalledTimes(3)
 })
})
