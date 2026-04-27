"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function TimePicker({
  value,
  onChange
}: {
  value: string, // format "HH:mm"
  onChange: (value: string) => void
}) {
  const [hours, minutes] = value.split(':').map(v => v || "00")

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0
    if (val > 23) val = 23
    if (val < 0) val = 0
    const newHours = val.toString().padStart(2, '0')
    onChange(`${newHours}:${minutes}`)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value) || 0
    if (val > 59) val = 59
    if (val < 0) val = 0
    const newMinutes = val.toString().padStart(2, '0')
    onChange(`${hours}:${newMinutes}`)
  }

  return (
    <div className="flex items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor="hours" className="text-[10px] uppercase font-bold text-slate-400">Hours</Label>
        <Input
          id="hours"
          type="number"
          min={0}
          max={23}
          value={hours}
          onChange={handleHourChange}
          className="w-16 h-10 text-center font-black"
        />
      </div>
      <div className="mb-2 font-black text-slate-400">:</div>
      <div className="grid gap-1.5">
        <Label htmlFor="minutes" className="text-[10px] uppercase font-bold text-slate-400">Minutes</Label>
        <Input
          id="minutes"
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={handleMinuteChange}
          className="w-16 h-10 text-center font-black"
        />
      </div>
      <div className="mb-2 ml-1 text-slate-300">
        <Clock size={16} />
      </div>
    </div>
  )
}
