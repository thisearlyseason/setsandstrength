-- Motion clips are independently fetched JSON assets. Only the local/admin uploader
-- can write public exercise assets; account clients retain read-only access.
update storage.buckets set allowed_mime_types = array[
  'model/gltf+json', 'model/gltf-binary', 'application/octet-stream',
  'application/json', 'image/png', 'image/webp'
] where id = 'exercise-assets';
