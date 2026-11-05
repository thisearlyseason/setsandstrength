export const PILOT_ENABLED = import.meta.env?.VITE_ILLUSTRATION_PILOT !== '0'
export const PILOT_CACHE = 'workout-illustration-approved-v1'
export function approvedVariant(index,id,variant){
 const j=index?.[id]?.[variant]
 const reviewed=j?.review?.status==='approved'&&j.review.qualifiedReview&&j.review.clothingReview&&j.review.poseReview
 const authorized=j?.publication?.status==='user-authorized'&&j.publication.masterHash?.length===64&&j.publication.assetSignature?.length===64
 return j?.exerciseId===id && j.variant===variant && !j.blockingIssues?.length && (reviewed||authorized) && j.assets?.length===j.poses?.length && j.assets.length>0 ? j : null
}
export function selectedMediaUrls(index,ids,variant){
 return [...new Set(ids.flatMap(id=>{const j=approvedVariant(index,id,variant);return j?[j.thumbnail.path,...j.assets.map(a=>a.path)]:[]}))]
}
export async function downloadSelected(index,ids,variant){
 if(!globalThis.caches)throw Error('Offline media storage is unavailable in this browser.')
 const urls=selectedMediaUrls(index,ids,variant),cache=await caches.open(PILOT_CACHE)
 for(const url of urls){if(await cache.match(url))continue;const r=await fetch(url);if(!r.ok)throw Error('Download failed; retry when connected.');await cache.put(url,r)}
 return urls.length
}
