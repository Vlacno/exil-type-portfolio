// Match the crop applied by Sanity's URL builder before the image is fetched.
export function imageDimensions(image) {
  const asset = image?.asset
  const metadata = asset?.metadata?.dimensions
  const match = /-(\d+)x(\d+)-[^-]+$/.exec(asset?._id || asset?._ref || '')
  const width = metadata?.width || Number(match?.[1])
  const height = metadata?.height || Number(match?.[2])
  if (!(width > 0 && height > 0)) return undefined
  const crop = image.crop || {}
  const croppedWidth = Math.round(width - (crop.right || 0) * width - Math.round((crop.left || 0) * width))
  const croppedHeight = Math.round(height - (crop.bottom || 0) * height - Math.round((crop.top || 0) * height))
  return croppedWidth > 0 && croppedHeight > 0 ? { width: croppedWidth, height: croppedHeight } : undefined
}
