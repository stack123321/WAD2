// Owner: Surya. Photos on past hangouts (Debrief, and the Past cards on 04).
// The files are in a private Supabase Storage bucket, "hangout-photos", at
// "<hangout id>/<user id>-<time>.jpg", with one row each in the hangout_photos table.
// Only people in the hangout can see, add or remove them (rules in supabase/schema.sql), so
// photos are shown through signed links that stop working after an hour.
// The sample hangouts (and no keys) have no database, so there are no photos there.
import { supabase } from './supabase'
import { isMockHangout } from './votes'

const BUCKET = 'hangout-photos'
const LINK_SECONDS = 60 * 60 // signed links last an hour
const MAX_SIDE = 1600 // photos are shrunk to at most 1600px wide or tall before uploading
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/**
 * The photos of some hangouts, newest first, each with a link to show it.
 * @param {string[]} hangoutIds one hangout (Debrief) or all the past ones (04)
 * @returns {Promise<Array<{ id, hangout_id, user_id, path, created_at, url }>>}
 */
export async function getPhotos(hangoutIds) {
  const ids = hangoutIds.filter((id) => !isMockHangout(id))
  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('hangout_photos')
    .select('id, hangout_id, user_id, path, created_at')
    .in('hangout_id', ids)
    .order('created_at', { ascending: false })
  if (error) {
    throw error
  }
  if (data.length === 0) {
    return []
  }

  // One request for all the links
  const { data: links, error: linkError } = await supabase.storage.from(BUCKET).createSignedUrls(
    data.map((p) => p.path),
    LINK_SECONDS,
  )
  if (linkError) {
    throw linkError
  }
  const result = []
  data.forEach((photo, i) => {
    if (links[i] && links[i].signedUrl) {
      result.push({ ...photo, url: links[i].signedUrl })
    }
  })
  return result
}

/**
 * Add one photo: shrink it, upload the file, then save its row.
 * @param {string} hangoutId
 * @param {string} myId
 * @param {File} file from <input type="file">
 */
export async function addPhoto(hangoutId, myId, file) {
  if (isMockHangout(hangoutId)) {
    throw new Error('Photos work in real hangouts.')
  }
  if (!TYPES.includes(file.type)) {
    throw new Error(`${file.name} isn't a photo.`)
  }

  const small = await shrink(file)
  const path = `${hangoutId}/${myId}-${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, small, { contentType: 'image/jpeg' })
  if (error) {
    throw error
  }

  const { error: rowError } = await supabase
    .from('hangout_photos')
    .insert({ hangout_id: hangoutId, path: path })
  if (rowError) {
    // don't leave a file with no row
    await supabase.storage.from(BUCKET).remove([path])
    throw rowError
  }
}

/** Remove a photo (yours, or any if you're the host): the file and its row. */
export async function deletePhoto(photo) {
  const { error } = await supabase.storage.from(BUCKET).remove([photo.path])
  if (error) {
    throw error
  }
  const { error: rowError } = await supabase.from('hangout_photos').delete().eq('id', photo.id)
  if (rowError) {
    throw rowError
  }
}

// Phone photos are often 4–10 MB: draw it smaller on a canvas and save as a JPEG (about
// 200–500 KB), so it uploads quickly and fits the 5 MB limit. Also fixes sideways photos,
// because the browser applies the photo's rotation when it draws it.
async function shrink(file) {
  let image
  try {
    image = await createImageBitmap(file)
  } catch (err) {
    console.error(err)
    throw new Error(`Couldn't open ${file.name}. Try a JPEG or PNG.`, { cause: err })
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error(`Couldn't shrink ${file.name}.`))
        }
      },
      'image/jpeg',
      0.8,
    )
  })
}
