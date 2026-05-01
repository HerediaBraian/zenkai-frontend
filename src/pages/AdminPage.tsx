import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useCurrentRole } from "@/hooks/useRole";
import type { Tables } from "@/integrations/supabase/types";
import { getErrorMessage } from "@/lib/getErrorMessage";

type AdminUserRow = Tables<"user_status"> & { roles: string[] };

export default function AdminPage() {
  const { isSuperAdmin } = useCurrentRole();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "usuario">("usuario");
  const [creating, setCreating] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data: status, error: e1 } = await supabase
        .from("user_status")
        .select("*")
        .order("created_at", { ascending: false });
      if (e1) throw e1;
      const { data: roles, error: e2 } = await supabase.from("user_roles").select("user_id, role");
      if (e2) throw e2;
      const roleMap: Record<string, string[]> = {};
      for (const r of roles ?? []) {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      }
      return ((status ?? []) as Tables<"user_status">[]).map((u) => ({
        ...u,
        roles: roleMap[u.user_id] || [],
      })) as AdminUserRow[];
    },
  });

  const handleCreate = async () => {
    if (!email.trim() || password.length < 8) {
      toast.error("Email válido y contraseña de al menos 8 caracteres");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: email.trim(), password, role },
      });
      if (error) throw error;
      toast.success("Cuenta creada");
      setEmail(""); setPassword(""); setRole("usuario");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Error al crear cuenta");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase.functions.invoke("admin-set-active", {
        body: { target_user_id: userId, is_active: !currentActive },
      });
      if (error) throw error;
      toast.success(currentActive ? "Cuenta desactivada" : "Cuenta activada");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
  };

  const roleBadge = (r: string) => {
    const map: Record<string, string> = {
      super_admin: "bg-primary text-primary-foreground",
      admin: "bg-amber-500 text-white",
      usuario: "bg-muted text-foreground",
    };
    return <Badge key={r} className={map[r] || ""}>{r}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva cuenta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuentas ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSuper = u.roles.includes("super_admin");
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell><div className="flex gap-1 flex-wrap">{u.roles.map(roleBadge)}</div></TableCell>
                      <TableCell>
                        {u.is_active
                          ? <span className="text-success text-sm font-medium">Activa</span>
                          : <span className="text-destructive text-sm font-medium">Inactiva</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {isSuper ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(u.user_id, u.is_active)}
                          >
                            {u.is_active
                              ? <UserX className="h-4 w-4 text-destructive" />
                              : <UserCheck className="h-4 w-4 text-success" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Sin cuentas
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva cuenta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@email.com" />
            </div>
            <div>
              <Label>Contraseña temporal (mín. 8 caracteres)</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              <p className="text-xs text-muted-foreground mt-1">El usuario podrá cambiarla luego desde su perfil.</p>
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "usuario")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuario estándar</SelectItem>
                  {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? "Creando..." : "Crear cuenta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}