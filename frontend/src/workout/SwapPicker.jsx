import { useEffect, useRef, useState } from 'react'

export function filterSwapOptions(options, query, equipment) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return options.filter(e => (!equipment || e.eq === equipment) && words.every(word => `${e.n} ${e.eq} ${e.tg} ${e.bp}`.toLowerCase().includes(word)))
}

export default function SwapPicker({ options, current, constrained, renderMedia, instructions, onSwap }) {
  const [query, setQuery] = useState(''), [equipment, setEquipment] = useState('')
  const [selected, setSelected] = useState(null), [limit, setLimit] = useState(24)
  const heading = useRef(null), lastCard = useRef(null), cards = useRef(new Map())
  const results = filterSwapOptions(options, query, equipment)
  useEffect(() => { setLimit(24) }, [query, equipment])
  useEffect(() => { if (selected) heading.current?.focus() }, [selected])
  const back = () => { setSelected(null); requestAnimationFrame(() => cards.current.get(lastCard.current)?.focus()) }
  const name = e => e.n?.replace(/\b\w/g, c => c.toUpperCase())
  if (selected) return <div className="modal-body swap-preview">
    <button className="outline" onClick={back}>← Back to alternatives</button>
    <div className="swap-preview-image">{renderMedia(selected)}</div>
    <span className="eyebrow">Same muscle · {selected.tg}</span>
    <h3 ref={heading} tabIndex={-1}>{name(selected)}</h3>
    <div className="detail-tags"><span>{selected.eq}</span><span>{selected.bp}</span></div>
    <p>A {selected.eq} exercise targeting your {selected.tg}.</p>
    {!!instructions[selected.id]?.length && <ol className="swap-cues">{instructions[selected.id].slice(0, 3).map((cue, i) => <li key={i}>{cue}</li>)}</ol>}
    <p className="swap-note">Your logged sets stay in this session. Check the load before starting the replacement.</p>
    <div className="swap-actions"><button className="outline" onClick={back}>Find another</button><button className="primary" onClick={() => onSwap(selected)}>SWAP</button></div>
  </div>
  return <div className="modal-body swap-picker">
    <div><span className="eyebrow">Keep your focus · {current?.tg}</span><p>Find a replacement for {name(current || {})}.</p>{constrained && <small>Your saved equipment and time limits still apply.</small>}</div>
    <div className="swap-filters"><label>Search exercises<input type="search" placeholder="Name, equipment or muscle" value={query} onChange={e => setQuery(e.target.value)}/></label><label>Equipment<select value={equipment} onChange={e => setEquipment(e.target.value)}><option value="">Any equipment</option>{[...new Set(options.map(e => e.eq))].sort().map(eq => <option key={eq}>{eq}</option>)}</select></label></div>
    <small role="status">{results.length} matching alternatives</small>
    {!results.length && <div className="swap-empty"><h3>No matching alternatives</h3><p>Try another search or equipment filter. Plan constraints may also limit replacements.</p><button className="outline" onClick={() => {setQuery(''); setEquipment('')}}>Clear filters</button></div>}
    <div className="swap-grid">{results.slice(0, limit).map(e => <button className="swap-card" key={e.id} ref={node => { if (node) cards.current.set(e.id, node); else cards.current.delete(e.id) }} data-exercise={e.id} onClick={event => {lastCard.current = e.id; setSelected(e)}}><div className="swap-card-image">{renderMedia(e)}</div><div className="swap-card-copy"><strong>{name(e)}</strong><small>{e.eq} · {e.tg}</small><span>Preview →</span></div></button>)}</div>
    {results.length > limit && <button className="outline wide" onClick={() => setLimit(n => n + 24)}>Show more exercises</button>}
  </div>
}
