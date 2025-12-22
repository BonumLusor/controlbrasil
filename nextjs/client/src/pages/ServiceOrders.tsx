import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Edit, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ServiceOrderFormData = {
  id?: number;
  orderNumber: string;
  customerId: number;
  serviceType: "manutencao_industrial" | "fitness_refrigeracao" | "automacao_industrial";
  equipmentDescription: string;
  reportedIssue: string;
  diagnosis: string;
  solution: string;
  status: "aberto" | "aguardando_componente" | "aprovado" | "em_reparo" | "sem_conserto" | "pago" | "entregue" | "entregue_a_receber";
  receivedById: number;
  technicianId: number;
  laborCost: string;
  partsCost: string;
  totalCost: string;
  receivedDate: Date;
  notes: string;
};

const initialFormData: ServiceOrderFormData = {
  orderNumber: "",
  customerId: 0,
  serviceType: "manutencao_industrial",
  equipmentDescription: "",
  reportedIssue: "",
  diagnosis: "",
  solution: "",
  status: "aberto",
  receivedById: 0,
  technicianId: 0,
  laborCost: "0.00",
  partsCost: "0.00",
  totalCost: "0.00",
  receivedDate: new Date(),
  notes: "",
};

const serviceTypes = [
  { value: "manutencao_industrial", label: "Manutenção Industrial" },
  { value: "fitness_refrigeracao", label: "Fitness/Refrigeração" },
  { value: "automacao_industrial", label: "Automação Industrial" },
];

const statusOptions = [
  { value: "aberto", label: "Aberto" },
  { value: "aguardando_componente", label: "Aguardando Componente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "em_reparo", label: "Em Reparo" },
  { value: "sem_conserto", label: "Sem Conserto" },
  { value: "pago", label: "Pago" },
  { value: "entregue", label: "Entregue" },
  { value: "entregue_a_receber", label: "Entregue - A Receber" },
];

export default function ServiceOrders() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ServiceOrderFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.serviceOrders.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: employees } = trpc.employees.listActive.useQuery();

  const createMutation = trpc.serviceOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Ordem de serviço criada com sucesso!");
      utils.serviceOrders.list.invalidate();
      setIsDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error("Erro ao criar ordem: " + error.message);
    },
  });

  const updateMutation = trpc.serviceOrders.update.useMutation({
    onSuccess: () => {
      toast.success("Ordem atualizada com sucesso!");
      utils.serviceOrders.list.invalidate();
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar ordem: " + error.message);
    },
  });

  const deleteMutation = trpc.serviceOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Ordem excluída com sucesso!");
      utils.serviceOrders.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao excluir ordem: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalCost = (
      parseFloat(formData.laborCost) + parseFloat(formData.partsCost)
    ).toFixed(2);

    if (isEditing && formData.id) {
      updateMutation.mutate({ ...formData, totalCost, id: formData.id });
    } else {
      const { id, ...data } = formData;
      createMutation.mutate({ ...data, totalCost });
    }
  };

  const handleEdit = (order: any) => {
    setFormData({
      id: order.id,
      orderNumber: order.orderNumber || "",
      customerId: order.customerId || 0,
      serviceType: order.serviceType || "manutencao_industrial",
      equipmentDescription: order.equipmentDescription || "",
      reportedIssue: order.reportedIssue || "",
      diagnosis: order.diagnosis || "",
      solution: order.solution || "",
      status: order.status || "aberto",
      receivedById: order.receivedById || 0,
      technicianId: order.technicianId || 0,
      laborCost: order.laborCost || "0.00",
      partsCost: order.partsCost || "0.00",
      totalCost: order.totalCost || "0.00",
      receivedDate: order.receivedDate ? new Date(order.receivedDate) : new Date(),
      notes: order.notes || "",
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta ordem?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleNewOrder = () => {
    const nextOrderNumber = `OS${Date.now().toString().slice(-8)}`;
    setFormData({ ...initialFormData, orderNumber: nextOrderNumber });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      aberto: { variant: "secondary" },
      aguardando_componente: { variant: "outline" },
      aprovado: { variant: "default" },
      em_reparo: { variant: "default" },
      sem_conserto: { variant: "destructive" },
      pago: { variant: "default" },
      entregue: { variant: "default" },
      entregue_a_receber: { variant: "outline" },
    };

    const statusInfo = statusMap[status] || statusMap.aberto;
    const label = statusOptions.find((s) => s.value === status)?.label || status;
    return <Badge variant={statusInfo.variant}>{label}</Badge>;
  };

  const getCustomerName = (customerId: number) => {
    return customers?.find((c) => c.id === customerId)?.name || "-";
  };

  const getEmployeeName = (employeeId: number | null) => {
    if (!employeeId) return "-";
    return employees?.find((e) => e.id === employeeId)?.name || "-";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie as ordens de serviço</p>
          </div>
          <Button onClick={handleNewOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Ordem
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Ordens</CardTitle>
            <CardDescription>
              {orders?.length || 0} ordem(ns) cadastrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Ordem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{getCustomerName(order.customerId)}</TableCell>
                      <TableCell className="capitalize">
                        {serviceTypes.find((t) => t.value === order.serviceType)?.label}
                      </TableCell>
                      <TableCell>{getEmployeeName(order.technicianId)}</TableCell>
                      <TableCell>R$ {parseFloat(order.totalCost || "0").toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ordem cadastrada
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Atualize as informações da ordem" : "Preencha os dados da nova ordem"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Nº Ordem *</Label>
                    <Input
                      id="orderNumber"
                      value={formData.orderNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, orderNumber: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Cliente *</Label>
                    <Select
                      value={formData.customerId.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, customerId: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Tipo de Serviço *</Label>
                    <Select
                      value={formData.serviceType}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, serviceType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="equipmentDescription">Descrição do Equipamento</Label>
                  <Textarea
                    id="equipmentDescription"
                    value={formData.equipmentDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, equipmentDescription: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedIssue">Problema Relatado</Label>
                  <Textarea
                    id="reportedIssue"
                    value={formData.reportedIssue}
                    onChange={(e) =>
                      setFormData({ ...formData, reportedIssue: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="receivedById">Recebido Por</Label>
                    <Select
                      value={formData.receivedById.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, receivedById: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-</SelectItem>
                        {employees?.map((e) => (
                          <SelectItem key={e.id} value={e.id.toString()}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="technicianId">Técnico</Label>
                    <Select
                      value={formData.technicianId.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, technicianId: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">-</SelectItem>
                        {employees?.map((e) => (
                          <SelectItem key={e.id} value={e.id.toString()}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="laborCost">Mão de Obra</Label>
                    <Input
                      id="laborCost"
                      type="number"
                      step="0.01"
                      value={formData.laborCost}
                      onChange={(e) =>
                        setFormData({ ...formData, laborCost: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partsCost">Peças</Label>
                    <Input
                      id="partsCost"
                      type="number"
                      step="0.01"
                      value={formData.partsCost}
                      onChange={(e) =>
                        setFormData({ ...formData, partsCost: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total</Label>
                    <Input
                      value={(
                        parseFloat(formData.laborCost) + parseFloat(formData.partsCost)
                      ).toFixed(2)}
                      disabled
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFormData(initialFormData);
                    setIsEditing(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : isEditing
                    ? "Atualizar"
                    : "Criar Ordem"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
