// Translucent, tapered membranes: fixed around the figure rather than a selection ring.
const ribbons = {
  back: [
    'M 34 52 C 4 108 287 126 270 190 C 300 125 48 91 34 52 Z',
    'M 270 190 C 308 244 11 250 35 316 C -12 248 260 214 270 190 Z',
    'M 35 316 C 20 365 269 376 256 418 C 292 365 62 341 35 316 Z',
  ],
  front: [
    'M 270 190 C 231 227 29 167 35 142 C 6 185 224 255 270 190 Z',
    'M 35 316 C 72 277 276 339 271 363 C 303 321 84 255 35 316 Z',
  ],
}
export default function BodySmoke({id,color,layer}) {
 const gradient=`${id}-veil-${layer}`
 return <g className={`body-smoke-veil smoke-${layer}`} aria-hidden="true" pointerEvents="none">
  <defs><linearGradient id={gradient} x1="0" y1="0" x2=".9" y2="1"><stop stopColor={color} stopOpacity="0"/><stop offset=".22" stopColor={color} stopOpacity=".09"/><stop offset=".48" stopColor={color} stopOpacity=".5"/><stop offset=".58" stopColor={color} stopOpacity=".13"/><stop offset=".83" stopColor={color} stopOpacity=".42"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
  {ribbons[layer].map((d,i)=><g key={d} style={{'--veil-delay':`${i*-1.7}s`}}><path d={d} fill={`url(#${gradient})`}/><path d={d} fill={`url(#${gradient})`} transform={`translate(${i%2?3:-3} ${i%2?-7:7})`} opacity=".33"/><path d={d} fill={`url(#${gradient})`} transform="translate(2 -3) scale(.99 1.01)" opacity=".22"/></g>)}
 </g>
}
