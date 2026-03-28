import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X } from "lucide-react";
import { useSchedules, useEnrollments, useAttendance, useMutateAttendance, useActivities } from "@/hooks/useSupabaseData";

const dayNames: Record<number, string> = { 0: "Domingo", 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado" };

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterActivity, setFilterActivity] = useState("all");
  const { data: schedules = [] } = useSchedules();
  const { data: enrollments = [] } = useEnrollments();
  const { data: attendance = [] } = useAttendance(date);
  const { data: activities = [] } = useActivities();
  const mutate = useMutateAttendance();

  const activeActivityIds = new Set(activities.filter(a => a.status === "active").map(a => a.id));
  const selectedDay = dayNames[new Date(date + "T12:00:00").getDay()];

  const todaySchedules = useMemo(() =>
    schedules.filter(s => s.day_of_week === selectedDay && s.status === "active" && activeActivityIds.has(s.activity_id)),
  [schedules, selectedDay, activities]);

  const studentsForDay = useMemo(() => {
    const result: { client_id: string; client_name: string; activity_id: string; activity_name: string; schedule_id: string; time: string; status: string }[] = [];
    for (const sched of todaySchedules) {
      if (filterActivity !== "all" && sched.activity_id !== filterActivity) continue;
      const schEnrollments = enrollments.filter(e => e.schedule_id === sched.id);
      for (const enr of schEnrollments) {
        const att = attendance.find(a => a.client_id === enr.client_id && a.schedule_id === sched.id);
        const client = (enr as any).clients;
        const act = (sched as any).activities;
        result.push({
          client_id: enr.client_id,
          client_name: client ? `${client.name} ${client.last_name}` : "—",
          activity_id: sched.activity_id,
          activity_name: act?.name || "—",
          schedule_id: sched.id,
          time: sched.start_time.slice(0, 5),
          status: att?.status || "unmarked",
        });
      }
    }
    return result.sort((a, b) => a.time.localeCompare(b.time));
  }, [todaySchedules, enrollments, attendance, filterActivity]);

  const handleMark = (s: typeof studentsForDay[0], status: "present" | "absent") => {
    mutate.mutate({ client_id: s.client_id, activity_id: s.activity_id, schedule_id: s.schedule_id, date, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[180px]" />
        <Select value={filterActivity} onValueChange={setFilterActivity}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filtrar por actividad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las actividades</SelectItem>
            {activities.filter(a => a.status === "active").map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-muted-foreground">{selectedDay} — {studentsForDay.length} alumnos</div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Asistencia — {selectedDay}</CardTitle></CardHeader>
        <CardContent>
          {studentsForDay.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No hay alumnos inscriptos para este día.</p>
          ) : (
            <div className="space-y-2">
              {studentsForDay.map((s) => (
                <div key={`${s.client_id}-${s.schedule_id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.client_name}</p>
                    <p className="text-xs text-muted-foreground">{s.time} — {s.activity_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant={s.status === "present" ? "default" : "outline"} size="sm" onClick={() => handleMark(s, "present")} disabled={mutate.isPending}>
                      <Check className="mr-1 h-3.5 w-3.5" /> Presente
                    </Button>
                    <Button variant={s.status === "absent" ? "destructive" : "outline"} size="sm" onClick={() => handleMark(s, "absent")} disabled={mutate.isPending}>
                      <X className="mr-1 h-3.5 w-3.5" /> Ausente
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
