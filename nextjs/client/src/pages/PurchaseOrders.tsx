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
import { Edit, Plus, ShoppingCart, Trash2, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OrderItem = {
  componentId: number;
  componentName?: string;
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

export default function PurchaseOrders() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>(initialFormData);
  const [currentItem, setCurrentItem] = useState<OrderItem>({
    componentId: 0,
    quantity: 1,
    unitPrice: "0.00",
    totalPrice: "0.00",
  });

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.purchaseOrders.list.useQuery();
  const { data: components } = trpc.components.list.useQuery();

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido de compra criado com sucesso!");
      utils.purchaseOrders.list.invalidate();
      utils.components.list.invalidate();
      setIsDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error("Erro ao criar pedido: " + error.message);
    },
  });

  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Pedido excluído com sucesso!");
      utils.purchaseOrders.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao excluir pedido: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    createMutation.mutate({
      ...formData,
      items: formData.items.map(({ componentName, ...item }) => item),
    });
  };

  const handleAddItem = () => {
    if (currentItem.componentId === 0) {
      toast.error("Selecione um componente");
      return;
    }

    const component = components?.find((c) => c.id === currentItem.componentId);
    if (!component) return;

    const totalPrice = (parseFloat(currentItem.unitPrice) * currentItem.quantity).toFixed(2);

    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          ...currentItem,
          componentName: component.name,
          totalPrice,
        },
      ],
    });

    setCurrentItem({
      componentId: 0,
      quantity: 1,
      unitPrice: "0.00",
      totalPrice: "0.00",
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este pedido?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleNewOrder = () => {
    const nextOrderNumber = `PO${Date.now().toString().slice(-8)}`;
    setFormData({ ...initialFormData, orderNumber: nextOrderNumber });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { label: "Pendente", variant: "secondary" },
      recebido_parcial: { label: "Parcial", variant: "outline" },
      recebido: { label: "Recebido", variant: "default" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };

    const statusInfo = statusMap[status] || statusMap.pendente;
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const totalOrderValue = formData.items.reduce(
    (sum, item) => sum + parseFloat(item.totalPrice),
    0
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pedidos de Compra</h1>
            <p className="text-muted-foreground">Gerencie os pedidos de componentes</p>
          </div>
          <Button onClick={handleNewOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>
              {orders?.length || 0} pedido(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : orders && orders.length > 0 ? (
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
                  {orders.map((order) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum pedido cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Compra</DialogTitle>
              <DialogDescription>
                Preencha os dados do pedido e adicione os componentes
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
                  
                  <div className="grid grid-cols-12 gap-2 mb-4">
                    <div className="col-span-5">
                      <Label>Componente</Label>
                      <Select
                        value={currentItem.componentId.toString()}
                        onValueChange={(value) =>
                          setCurrentItem({ ...currentItem, componentId: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {components?.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
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
                    <div className="col-span-3">
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
                    <div className="col-span-2 flex items-end">
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
                            <span className="font-medium">{item.componentName}</span>
                            <span className="text-sm text-muted-foreground ml-2">
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
