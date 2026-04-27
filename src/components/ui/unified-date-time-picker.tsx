"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock2Icon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group"

export function UnifiedDateTimePicker({
  date,
  setDate,
  time,
  setTime,
  placeholder = "选择日期和时间"
}: {
  date: Date | undefined,
  setDate: (d: Date | undefined) => void,
  time: string,
  setTime: (t: string) => void,
  placeholder?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-11 border-slate-200",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
          {date ? (
            <span className="font-bold text-slate-700">
              {format(date, "PPP")} <span className="text-indigo-600 ml-1">{time}</span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
        <Card size="sm" className="w-[280px] overflow-hidden border-none shadow-none">
          <CardContent className="p-0 border-b border-slate-100">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              className="p-3"
            />
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-4">
            <FieldGroup className="w-full">
              <Field className="w-full">
                <FieldLabel className="text-[10px] mb-2 font-black uppercase tracking-widest text-slate-400">设定具体时间 / TIME</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-white font-black text-sm h-10 appearance-none [&::-webkit-calendar-picker-indicator]:hidden shadow-sm"
                  />
                  <InputGroupAddon>
                    <Clock2Icon size={14} className="text-indigo-400" />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
