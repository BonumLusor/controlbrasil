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
import { Edit, Plus, Trash2, Upload, X, Loader2, FileText, Filter, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { PDFDownloadLink } from '@react-pdf/renderer';
import { ServiceOrderPDF } from '@/components/reports/ServiceOrderPDF';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Tipos atualizados para corresponder às opções (ServiceTypes e StatusOptions)
type ServiceOrderFormData = {
  id?: number;
  orderNumber: string;
  customerId: number;
  serviceType: "manutencao_industrial" | "fitness" | "refrigeracao" | "automacao_industrial";
  equipment: string;
  brand: string;
  model: string;
  serialNumber: string;
  equipmentDescription: string;
  reportedIssue: string;
  diagnosis: string;
  solution: string;
  status: "em_aberto" | "aguardando_orcamento" | "aguardando_aprovacao" | "aguardando_componente" | "aprovado" | "em_reparo" | "sem_conserto" | "pago" | "entregue" | "entregue_a_receber";
  receivedById: number;
  technicianId: number;
  laborCost: string;
  partsCost: string;
  totalCost: string;
  receivedDate: Date | undefined;
  notes: string;
  images: string[];
  usedComponents: { componentId: number; quantity: number }[];
};

const initialFormData: ServiceOrderFormData = {
  orderNumber: "",
  customerId: 0,
  serviceType: "manutencao_industrial",
  equipment: "",
  brand: "",
  model: "",
  serialNumber: "",
  equipmentDescription: "",
  reportedIssue: "",
  diagnosis: "",
  solution: "",
  status: "em_aberto",
  receivedById: 0,
  technicianId: 0,
  laborCost: "0.00",
  partsCost: "0.00",
  totalCost: "0.00",
  receivedDate: new Date(),
  notes: "",
  images: [],
  usedComponents: [],
};

const serviceTypes = [
  { value: "manutencao_industrial", label: "Manutenção Industrial" },
  { value: "fitness", label: "Fitness" },
  { value: "refrigeracao", label: "Refrigeração" },
  { value: "automacao_industrial", label: "Automação Industrial" },
];

const statusOptions = [
  { value: "em_aberto", label: "Em Aberto" },
  { value: "aguardando_orcamento", label: "Aguardando Orçamento" },
  { value: "aguardando_aprovacao", label: "Aguardando Aprovação" },
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

  // --- FILTROS ---
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Estados locais para seleção de componente na modal
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.serviceOrders.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: employees } = trpc.employees.listActive.useQuery();
  const { data: componentsList } = trpc.components.list.useQuery();

  const { refetch: fetchNextNumber, isFetching: isLoadingNumber } = trpc.serviceOrders.getNextNumber.useQuery(undefined, {
    enabled: false,
    refetchOnWindowFocus: false
  });

  const uploadMutation = trpc.serviceOrders.uploadImage.useMutation();

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

  // --- Lógica de Componentes ---
  const handleAddComponent = () => {
    if (!selectedComponentId || selectedQuantity <= 0) return;
    const compId = parseInt(selectedComponentId);
    
    setFormData(prev => {
      const exists = prev.usedComponents.find(c => c.componentId === compId);
      if (exists) {
        return {
          ...prev,
          usedComponents: prev.usedComponents.map(c => 
            c.componentId === compId ? { ...c, quantity: c.quantity + selectedQuantity } : c
          )
        };
      }
      return {
        ...prev,
        usedComponents: [...prev.usedComponents, { componentId: compId, quantity: selectedQuantity }]
      };
    });
    
    setSelectedComponentId("");
    setSelectedQuantity(1);
  };

  const handleRemoveComponent = (compId: number) => {
    setFormData(prev => ({
      ...prev,
      usedComponents: prev.usedComponents.filter(c => c.componentId !== compId)
    }));
  };
  // -----------------------------

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      const toastId = toast.loading("Enviando imagem...");

      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const result = await uploadMutation.mutateAsync({
            file: base64,
            fileName: file.name
          });

          setFormData(prev => ({
            ...prev,
            images: [...prev.images, result.url]
          }));
          toast.dismiss(toastId);
          toast.success("Imagem enviada!");
        } catch (error) {
          toast.dismiss(toastId);
          toast.error("Erro ao enviar imagem.");
          console.error(error);
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const labor = parseFloat(formData.laborCost) || 0;
    const parts = parseFloat(formData.partsCost) || 0;
    const taxValue = labor * 0.06; // Imposto de 6% sobre mão de obra
    
    // Total = Mão de Obra + Peças + Imposto
    const totalCost = (labor + parts + taxValue).toFixed(2);

    if (isEditing && formData.id) {
      updateMutation.mutate({ ...formData, totalCost, id: formData.id, receivedDate: formData.receivedDate || new Date() });
    } else {
      const { id, ...data } = formData;
      createMutation.mutate({ ...data, totalCost, receivedDate: data.receivedDate || new Date() });
    }
  };

  const handleEdit = async (order: any) => {
    setIsEditing(true);
    setIsDialogOpen(true);

    try {
      const fullOrder = await utils.serviceOrders.getById.fetch({ id: order.id });

      if (fullOrder) {
        setFormData({
          id: fullOrder.id,
          orderNumber: fullOrder.orderNumber || "",
          customerId: fullOrder.customerId || 0,
          serviceType: (fullOrder.serviceType as any) || "manutencao_industrial",
          equipment: fullOrder.equipment || "",
          brand: fullOrder.brand || "",
          model: fullOrder.model || "",
          serialNumber: fullOrder.serialNumber || "",
          equipmentDescription: fullOrder.equipmentDescription || "",
          reportedIssue: fullOrder.reportedIssue || "",
          diagnosis: fullOrder.diagnosis || "",
          solution: fullOrder.solution || "",
          status: (fullOrder.status as any) || "em_aberto",
          receivedById: fullOrder.receivedById || 0,
          technicianId: fullOrder.technicianId || 0,
          laborCost: fullOrder.laborCost || "0.00",
          partsCost: fullOrder.partsCost || "0.00",
          totalCost: fullOrder.totalCost || "0.00",
          receivedDate: fullOrder.receivedDate ? new Date(fullOrder.receivedDate) : new Date(),
          notes: fullOrder.notes || "",
          images: fullOrder.images || [],
          usedComponents: fullOrder.components ? fullOrder.components.map((c: any) => ({
             componentId: c.componentId,
             quantity: c.quantity
          })) : []
        });
      }
    } catch (err) {
      toast.error("Erro ao carregar detalhes da ordem");
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta ordem?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleNewOrder = async () => {
    try {
      const { data: nextNumber } = await fetchNextNumber();
      const orderNumber = nextNumber ? `OS${nextNumber}` : "OS1000";

      setFormData({
        ...initialFormData,
        orderNumber: orderNumber
      });
      setIsDialogOpen(true);
    } catch (err) {
      toast.error("Erro ao gerar número.");
      setFormData({ ...initialFormData, orderNumber: "OS1000" });
      setIsDialogOpen(true);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      em_aberto: { variant: "outline" },
      aguardando_orcamento: { variant: "secondary" },
      aguardando_aprovacao: { variant: "secondary" },
      aguardando_componente: { variant: "outline" },
      aprovado: { variant: "default" },
      em_reparo: { variant: "default" },
      sem_conserto: { variant: "destructive" },
      pago: { variant: "default" },
      entregue: { variant: "default" },
      entregue_a_receber: { variant: "outline" },
    };

    const statusInfo = statusMap[status] || statusMap.em_aberto;
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

  // --- LÓGICA DE FILTRAGEM ---
  const filterByDate = (dateStr: string | Date) => {
    if (dateFilter === "all") return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (dateFilter === "this_month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (dateFilter === "last_3_months") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return date >= threeMonthsAgo;
    }
    if (dateFilter === "this_year") {
      return date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredOrders = orders?.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesDate = filterByDate(order.receivedDate);
    return matchesStatus && matchesDate;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie as ordens de serviço</p>
          </div>
          <Button onClick={handleNewOrder} disabled={isLoadingNumber}>
            {isLoadingNumber ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Nova Ordem
          </Button>
        </div>

        {/* --- FILTROS UI --- */}
        <div className="flex flex-wrap gap-4 items-center bg-muted/20 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          
          <div className="w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[200px]">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Período</SelectItem>
                <SelectItem value="this_month">Este Mês</SelectItem>
                <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                <SelectItem value="this_year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(statusFilter !== "all" || dateFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setDateFilter("all"); }}>
              Limpar
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Ordens</CardTitle>
            <CardDescription>
              {filteredOrders?.length || 0} ordem(ns) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Ordem</TableHead>
                    <TableHead>Data Rec.</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {/* DATA FORMATADA DD/MM/YY */}
                        {new Date(order.receivedDate).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>{getCustomerName(order.customerId)}</TableCell>
                      <TableCell className="capitalize">
                        {serviceTypes.find((t) => t.value === order.serviceType)?.label}
                      </TableCell>
                      <TableCell>{getEmployeeName(order.technicianId)}</TableCell>
                      <TableCell>R$ {parseFloat(order.totalCost || "0").toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <PDFDownloadLink
                            document={
                              <ServiceOrderPDF
                                order={order}
                                customer={customers?.find(c => c.id === order.customerId)}
                                technician={employees?.find(e => e.id === order.technicianId)}
                              />
                            }
                            fileName={`${order.orderNumber}.pdf`}
                          >
                            {/* @ts-ignore */}
                            {({ loading }) => (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={loading}
                                title="Exportar PDF"
                              >
                                {loading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </PDFDownloadLink>

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
                Nenhuma ordem encontrada com os filtros atuais.
              </div>
            )}
          </CardContent>
        </Card>

        {/* DIALOG DE NOVA/EDITAR ORDEM */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
                {/* --- MUDANÇA: Grid de 3 colunas para incluir Data --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  
                  {/* NOVO CAMPO DE DATA COM DATEPICKER CUSTOMIZADO */}
                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="receivedDate">Data de Entrada</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !formData.receivedDate && "text-muted-foreground"
                          )}
                        >
                          {formData.receivedDate ? (
                            format(formData.receivedDate, "dd/MM/yy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.receivedDate}
                          onSelect={(date) => {
                            if (date) {
                              // Ajusta para meio-dia para evitar problemas de fuso horário
                              const adjustedDate = new Date(date);
                              adjustedDate.setHours(12, 0, 0, 0);
                              setFormData({ ...formData, receivedDate: adjustedDate });
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
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

                {/* --- SEÇÃO DE EQUIPAMENTO --- */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipamento</Label>
                    <Input
                      id="equipment"
                      placeholder="Ex: Inversor de Frequência"
                      value={formData.equipment}
                      onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Nº de Série</Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
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
                  <Label htmlFor="equipmentDescription">Descrição do Serviço</Label>
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

                {/* --- SEÇÃO DE COMPONENTES --- */}
                <div className="border rounded-md p-3 bg-slate-50 dark:bg-slate-900/50 mt-2">
                  <Label className="text-base font-semibold mb-2 block">Peças Utilizadas (Baixa Estoque)</Label>
                  
                  <div className="flex gap-2 items-end mb-4">
                    <div className="flex-1 space-y-2">
                      <Label>Componente</Label>
                      <Select value={selectedComponentId} onValueChange={setSelectedComponentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um componente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {componentsList?.map((comp: any) => (
                            <SelectItem key={comp.id} value={comp.id.toString()}>
                              {comp.name} (Disp: {comp.quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Qtd</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(parseInt(e.target.value))}
                      />
                    </div>
                    <Button type="button" onClick={handleAddComponent} variant="secondary">Adicionar</Button>
                  </div>

                  {formData.usedComponents.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Componente</TableHead>
                          <TableHead className="w-20">Qtd</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.usedComponents.map((item, idx) => {
                          const compName = componentsList?.find((c: any) => c.id === item.componentId)?.name || "Item " + item.componentId;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="py-2">{compName}</TableCell>
                              <TableCell className="py-2">{item.quantity}</TableCell>
                              <TableCell className="py-2">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 text-red-500"
                                  onClick={() => handleRemoveComponent(item.componentId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>

                <div className="space-y-2 mt-2">
                  <Label>Imagens e Documentos</Label>
                  <div className="flex flex-wrap gap-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                    {formData.images.map((url, idx) => (
                      <div key={idx} className="relative group w-24 h-24 border rounded overflow-hidden bg-white">
                        <img
                          src={url}
                          alt={`Anexo ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onClick={() => window.open(url, '_blank')}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-slate-100 transition-all">
                      {uploadMutation.isPending ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploadMutation.isPending}
                      />
                    </label>
                  </div>
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

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                    <Label>Imposto (6%)</Label>
                      <Input
                      value={((parseFloat(formData.laborCost) || 0) * 0.06).toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Final</Label>
                    <Input
                      value={(
                        (parseFloat(formData.laborCost) || 0) * 1.06 +
                        (parseFloat(formData.partsCost) || 0)
                      ).toFixed(2)}
                      disabled
                      className="font-bold bg-muted"
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