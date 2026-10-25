import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Maximize2, X } from 'lucide-react'

interface Props {
  value: string
  size?: number
}

export default function QRCodePanel({ value, size = 128 }: Props) {
  const [dataUrl, setDataUrl] = useState('')
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, {
      width: 512,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0e3a5c', light: '#ffffff' },
    })
      .then(url => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        /* 二维码生成失败不影响主流程 */
      })
    return () => {
      active = false
    }
  }, [value])

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 shadow-md">
          {dataUrl ? (
            <img src={dataUrl} alt="课堂二维码" style={{ width: size, height: size }} />
          ) : (
            <div style={{ width: size, height: size }} className="bg-muted" />
          )}
        </div>
        {dataUrl && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            放大投屏
          </button>
        )}
      </div>

      {zoomed && dataUrl && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/80 p-6"
          onClick={() => setZoomed(false)}
        >
          <div className="rounded-2xl bg-white p-6">
            <img src={dataUrl} alt="课堂二维码" className="h-[58vh] w-[58vh] max-w-full" />
          </div>
          <p className="text-lg font-medium text-white">请使用手机扫码进入课堂</p>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 px-4 py-2 text-sm text-white"
            onClick={() => setZoomed(false)}
          >
            <X className="h-4 w-4" />
            关闭
          </button>
        </div>
      )}
    </>
  )
}
