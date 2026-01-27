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
import { CheckCircle, Eye, Package, Plus, ShoppingBag, Trash2, Truck, Filter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ... (Tipos OrderItem e OrderFormData mantidos iguais) ...
type OrderItem = {
  componentId?: number;
  productId?: number;
  name?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

type OrderFormData = {
  orderNumber: string;
  supplier: string;
  orderDate: Date;
  notes: string;
  items: OrderItem[];
};

const initialFormData: OrderFormData = {
  orderNumber: "",
  supplier: "",
  orderDate: new Date(),
  notes: "",
  items: [],
};

const statusOptions = [
  { value: "pendente", label: "Pendente" },
  { value: "aguardando_entrega", label: "Aguardando Entrega" },
  { value: "recebido_parcial", label: "Recebido Parcial" },
  { value: "recebido", label: "Recebido" },
  { value: "cancelado", label: "Cancelado" },
];

export default function PurchaseOrders() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [viewOrderId, setViewOrderId] = useState<number | null>(null);
  const [itemType, setItemType] = useState<"component" | "product">("component");
  const [selectedId, setSelectedId] = useState<string>("");
  const [currentItem, setCurrentItem] = useState<{
    quantity: number;
    unitPrice: string;
  }>({
    quantity: 1,
    unitPrice: "0.00",
  });

  const utils = trpc.useUtils();
  const { data: user } = trpc.auth.me.useQuery();
  const { data: orders, isLoading } = trpc.purchaseOrders.list.useQuery();
  
  const { data: orderItems } = trpc.purchaseOrders.getItems.useQuery(
    { purchaseOrderId: viewOrderId! }, 
    { enabled: !!viewOrderId }
  );

  const { data: components } = trpc.components.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido de compra criado com sucesso!");
      utils.purchaseOrders.list.invalidate();
      setIsDialogOpen(false);
      setFormData(initialFormData);
      resetItemForm();
    },
    onError: (error) => toast.error("Erro ao criar pedido: " + error.message),
  });

  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Pedido excluído!");
      utils.purchaseOrders.list.invalidate();
    },
    onError: (error) => toast.error("Erro ao excluir: " + error.message),
  });

  const approveMutation = trpc.purchaseOrders.approve.useMutation({
    onSuccess: () => {
      toast.success("Pedido aprovado! Aguardando entrega.");
      utils.purchaseOrders.list.invalidate();
    },
    onError: (error) => toast.error("Erro ao aprovar: " + error.message),
  });

  const receiveMutation = trpc.purchaseOrders.receiveAll.useMutation({
    onSuccess: () => {
      toast.success("Itens recebidos e estoque atualizado!");
      utils.purchaseOrders.list.invalidate();
      utils.components.list.invalidate();
      utils.products.list.invalidate();
    },
    onError: (error) => toast.error("Erro ao receber: " + error.message),
  });

  const resetItemForm = () => {
    setSelectedId("");
    setCurrentItem({ quantity: 1, unitPrice: "0.00" });
    setItemType("component");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }
    const itemsToSend = formData.items.map(({ name, ...item }) => item);
    createMutation.mutate({
      ...formData,
      items: itemsToSend as any,
    });
  };

  const handleAddItem = () => {
    if (!selectedId) {
      toast.error("Selecione um item");
      return;
    }

    let newItem: OrderItem;
    const totalPrice = (parseFloat(currentItem.unitPrice) * currentItem.quantity).toFixed(2);
    const id = parseInt(selectedId);

    if (itemType === "component") {
      const component = components?.find((c) => c.id === id);
      if (!component) return;
      newItem = {
        componentId: id,
        name: component.name,
        quantity: currentItem.quantity,
        unitPrice: currentItem.unitPrice,
        totalPrice,
      };
    } else {
      const product = products?.find((p) => p.id === id);
      if (!product) return;
      newItem = {
        productId: id,
        name: product.name,
        quantity: currentItem.quantity,
        unitPrice: currentItem.unitPrice,
        totalPrice,
      };
    }

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setSelectedId("");
    setCurrentItem({ quantity: 1, unitPrice: "0.00" });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id });
  };

  const handleReceive = (id: number) => {
    if (!user) {
      toast.error("Você precisa estar logado para receber itens.");
      return;
    }
    if (confirm("Confirmar recebimento de TODOS os itens? O estoque será atualizado.")) {
      receiveMutation.mutate({ id, receivedById: user.id });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleNewOrder = () => {
    const nextOrderNumber = `PO${Date.now().toString().slice(-8)}`;
    setFormData({ ...initialFormData, orderNumber: nextOrderNumber });
    resetItemForm();
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { label: "Pendente", variant: "secondary" },
      aguardando_entrega: { label: "Aguardando Entrega", variant: "outline" },
      recebido_parcial: { label: "Parcial", variant: "outline" },
      recebido: { label: "Recebido", variant: "default" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || statusMap.pendente;
    const className = status === 'recebido' ? 'bg-green-500 hover:bg-green-600' : 
                      status === 'aguardando_entrega' ? 'border-blue-500 text-blue-500' : '';
    
    return <Badge variant={statusInfo.variant} className={className}>{statusInfo.label}</Badge>;
  };

  const totalOrderValue = formData.items.reduce(
    (sum, item) => sum + parseFloat(item.totalPrice),
    0
  );

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
    const matchesDate = filterByDate(order.orderDate);
    return matchesStatus && matchesDate;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pedidos de Compra</h1>
            <p className="text-muted-foreground">Gerencie aquisições de estoque e revenda</p>
          </div>
          <Button onClick={handleNewOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
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
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>
              {filteredOrders?.length || 0} pedido(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Pedido</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.supplier || "-"}</TableCell>
                      <TableCell>
                        {new Date(order.orderDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        R$ {parseFloat(order.totalAmount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewOrderId(order.id)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {order.status === 'pendente' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              onClick={() => handleApprove(order.id)}
                              title="Aprovar Pedido"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                            </Button>
                          )}

                          {order.status === 'aguardando_entrega' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => handleReceive(order.id)}
                              title="Receber Itens"
                            >
                              <Truck className="h-4 w-4 mr-1" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(order.id)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
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
                Nenhum pedido encontrado.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ... Dialogs (Detalhes e Novo Pedido) mantidos ... */}
        {/* --- DIALOG DE VISUALIZAÇÃO DE DETALHES --- */}
        <Dialog open={!!viewOrderId} onOpenChange={(open) => !open && setViewOrderId(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido #{orders?.find(o => o.id === viewOrderId)?.orderNumber}</DialogTitle>
              <DialogDescription>
                {orders?.find(o => o.id === viewOrderId)?.supplier} - {orders?.find(o => o.id === viewOrderId)?.status}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-right">R$ {parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {!orderItems?.length && (
                    <TableRow><TableCell colSpan={4} className="text-center">Carregando itens...</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between mt-4 font-bold border-t pt-2">
                <span>Total:</span>
                <span>R$ {orderItems?.reduce((acc, i) => acc + parseFloat(i.totalPrice), 0).toFixed(2)}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewOrderId(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG DE NOVO PEDIDO */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Compra</DialogTitle>
              <DialogDescription>
                Preencha os dados e adicione componentes ou produtos
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Nº Pedido *</Label>
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
                    <Label htmlFor="supplier">Fornecedor</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) =>
                        setFormData({ ...formData, supplier: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Data do Pedido</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={formData.orderDate.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setFormData({ ...formData, orderDate: new Date(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Itens do Pedido</h3>
                  
                  {/* Seleção do Tipo */}
                  <div className="flex gap-6 mb-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="type-component"
                        name="itemType"
                        checked={itemType === "component"}
                        onChange={() => { setItemType("component"); setSelectedId(""); }}
                        className="accent-primary h-4 w-4"
                      />
                      <Label htmlFor="type-component" className="flex items-center gap-2 cursor-pointer">
                        <Package className="h-4 w-4" /> Componente (Peça)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="type-product"
                        name="itemType"
                        checked={itemType === "product"}
                        onChange={() => { setItemType("product"); setSelectedId(""); }}
                        className="accent-primary h-4 w-4"
                      />
                      <Label htmlFor="type-product" className="flex items-center gap-2 cursor-pointer">
                        <ShoppingBag className="h-4 w-4" /> Produto (Revenda)
                      </Label>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 mb-4 items-end">
                    <div className="col-span-5 space-y-2">
                      <Label>
                        {itemType === "component" ? "Componente" : "Produto"}
                      </Label>
                      <Select
                        value={selectedId}
                        onValueChange={setSelectedId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {itemType === "component" 
                            ? components?.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                  {c.name} {c.partNumber ? `(${c.partNumber})` : ""}
                                </SelectItem>
                              ))
                            : products?.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.name} {p.sku ? `(SKU: ${p.sku})` : ""}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={currentItem.quantity}
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label>Preço Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={currentItem.unitPrice}
                        onChange={(e) =>
                          setCurrentItem({ ...currentItem, unitPrice: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Button type="button" onClick={handleAddItem} className="w-full">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {formData.items.length > 0 && (
                    <div className="border rounded-lg p-4 space-y-2">
                      {formData.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {item.productId ? (
                                <Badge variant="secondary" className="text-[10px] h-5">Produto</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-5">Componente</Badge>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {item.quantity}x R$ {parseFloat(item.unitPrice).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold">
                              R$ {parseFloat(item.totalPrice).toFixed(2)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t font-bold">
                        <span>Total do Pedido:</span>
                        <span>R$ {totalOrderValue.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setFormData(initialFormData);
                    resetItemForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Criar Pedido"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}