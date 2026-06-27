'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { ReactNode } from 'react'
import Button from '@/components/ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  confirmVariant = 'primary',
  loading = false,
  onConfirm
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          onInteractOutside={(e) => {
            if (loading) e.preventDefault()
          }}
        >
          <Dialog.Title className="text-lg font-semibold text-gray-900">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-gray-500">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary" disabled={loading}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
