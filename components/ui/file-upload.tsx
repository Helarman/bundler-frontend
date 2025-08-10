'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from './button'

interface FileUploadProps {
  accept?: string
  onDrop: (acceptedFiles: File[]) => void
}

export function FileUpload({ accept, onDrop }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)

  const onDropCallback = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0])
        onDrop(acceptedFiles)
      }
    },
    [onDrop]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCallback,
    accept: accept ? { [accept]: [] } : undefined,
    maxFiles: 1,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
      }`}
    >
      <input {...getInputProps()} />
      {file ? (
        <p className="text-sm">{file.name}</p>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? 'Drop the file here'
              : 'Drag & drop a file here, or click to select'}
          </p>
          <Button variant="outline" size="sm" className="mt-2">
            Select File
          </Button>
        </div>
      )}
    </div>
  )
}