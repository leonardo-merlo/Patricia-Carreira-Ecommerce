"use client" // onError handler requires browser event

import { useState } from "react"
import Image from "next/image"

const PLACEHOLDER = "/images/placeholder-product.svg"

interface ProductImageProps {
  src: string
  alt: string
  className?: string
  sizes?: string
}

export function ProductImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw",
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    // next/image não otimiza SVG — usa img nativo para o placeholder
    return (
      <img
        src={PLACEHOLDER}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}
