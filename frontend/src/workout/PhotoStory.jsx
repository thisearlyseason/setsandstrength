import { ArrowUpRight } from 'lucide-react'
export default function PhotoStory({eyebrow,title,detail,variant='train',action,onAction}) {
 return <section className={`photo-story photo-story-${variant}`}><div className="photo-story-image" aria-hidden="true"/><div className="photo-story-shade"/><div className="photo-story-copy"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{detail&&<p>{detail}</p>}{action&&<button className="photo-story-action" onClick={onAction}>{action}<ArrowUpRight size={18}/></button>}</div><div className="photo-orbit" aria-hidden="true"/></section>
}
