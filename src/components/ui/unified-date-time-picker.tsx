"use client"

import * as React from "react"
import { Clock2Icon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group"

export function UnifiedDateTimePicker({
  date,
  setDate,
  time,
  setTime,
  label = "开始时间"
}: {
  date: Date | undefined,
  setDate: (d: Date | undefined) => void,
  time: string,
  setTime: (t: string) => void,
  label?: string
}) {
  return (
    <Card size="sm" className="w-full bg-white border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-0 border-b border-slate-100 flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="p-2"
        />
      </CardContent>
      <CardFooter className="bg-slate-50/50 p-4">
        <FieldGroup className="w-full">
          <Field className="w-full">
            <FieldLabel className="text-[10px] mb-2">{label}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-white font-black text-sm h-11 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <InputGroupAddon>
                <Clock2Icon size={16} className="text-slate-400" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
      </CardFooter>
    </Card>
  )
}
