import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, RotateCcw, Trash2, CheckCircle, Ban, Filter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Sales() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [cart, setCart] = useState<{ productId: number; name: string; price: number; quantity: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qtyInput, setQtyInput] = useState(1);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const utils = trpc.useUtils();
  const { data: sales } = trpc.sales.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery();

  // Mutation para mudar status
  const statusMutation = trpc.sales.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.sales.list.invalidate();
      utils.products.list.invalidate();
      utils.reports.invalidate();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`)
  });

  // Mutation para excluir definitivamente
  const deleteMutation = trpc.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("Venda excluída definitivamente.");
      utils.sales.list.invalidate();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`)
  });

  const handleStatusChange = (id: number, newStatus: "concluido" | "cancelado" | "devolvido") => {
    let msg = "";
    if (newStatus === "concluido") msg = "Reaprovar venda? O estoque será baixado novamente.";
    if (newStatus === "devolvido") msg = "Marcar como devolvido? O estoque será restaurado.";
    if (newStatus === "cancelado") msg = "Cancelar venda? O estoque será restaurado.";

    if (!confirm(msg)) return;
    statusMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este registro?")) return;
    deleteMutation.mutate({ id });
  };

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venda registrada!");
      utils.sales.list.invalidate();
      utils.products.list.invalidate();
      utils.reports.invalidate();
      setIsDialogOpen(false);
      setCart([]);
      setSelectedCustomer("");
    },
    onError: (err) => toast.error(err.message),
  });

  const addToCart = () => {
    if (!selectedProduct) return;
    const prod = products?.find((p) => p.id.toString() === selectedProduct);
    if (!prod) return;
    if (prod.quantity < qtyInput) { toast.error("Estoque insuficiente!"); return; }
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) return prev.map((item) => item.productId === prod.id ? { ...item, quantity: item.quantity + qtyInput } : item);
      return [...prev, { productId: prod.id, name: prod.name, price: Number(prod.price), quantity: qtyInput }];
    });
    setQtyInput(1);
  };

  const handleFinishSale = () => {
    if (!selectedCustomer || cart.length === 0) { toast.error("Preencha os dados."); return; }
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    createSaleMutation.mutate({
      customerId: parseInt(selectedCustomer),
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
      totalAmount: total,
      paymentMethod: "dinheiro"
    });
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

  const filteredSales = sales?.filter(sale => {
    // Normalizar status para "concluido" se for null/undefined para compatibilidade
    const currentStatus = sale.status || "concluido";
    const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;
    const matchesDate = filterByDate(sale.saleDate);
    return matchesStatus && matchesDate;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Vendas</h1>
          <Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Venda</Button>
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
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
                <SelectItem value="devolvido">Devolvido</SelectItem>
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
          <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales?.map((sale) => (
                  <TableRow key={sale.id} className={sale.status !== 'concluido' ? "bg-gray-50/50 opacity-70" : ""}>
                    <TableCell>#{sale.id}</TableCell>
                    <TableCell>{sale.customerName || "Cliente não identificado"}</TableCell>
                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>R$ {Number(sale.totalAmount).toFixed(2)}</TableCell>
                    
                    <TableCell>
                      <Badge variant={sale.status === 'concluido' ? 'default' : sale.status === 'cancelado' ? 'destructive' : 'secondary'}
                        className={sale.status === 'concluido' ? "bg-green-600" : (sale.status === 'devolvido' ? "bg-orange-500" : "")}
                      >
                        {sale.status ? sale.status.toUpperCase() : "CONCLUIDO"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {sale.status === 'concluido' ? (
                          <>
                            <Button variant="outline" size="icon" title="Devolver (Estorna Estoque)"
                              onClick={() => handleStatusChange(sale.id, "devolvido")} className="text-orange-600 border-orange-200 hover:bg-orange-50">
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Cancelar"
                              onClick={() => handleStatusChange(sale.id, "cancelado")} className="text-red-600 hover:bg-red-50">
                              <Ban className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="icon" title="Reaprovar (Baixa Estoque)"
                              onClick={() => handleStatusChange(sale.id, "concluido")} className="text-green-600 border-green-200 hover:bg-green-50">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="destructive" size="icon" title="Excluir Definitivamente"
                              onClick={() => handleDelete(sale.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSales?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">Nenhuma venda encontrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog mantido */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Registrar Venda</DialogTitle>
              <DialogDescription>Selecione o cliente e os produtos.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente..." /></SelectTrigger>
                  <SelectContent>{customers?.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 p-4 border rounded-md bg-muted/20">
                <div className="flex-1 space-y-2">
                  <Label>Produto</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger><SelectValue placeholder="Adicionar produto..." /></SelectTrigger>
                    <SelectContent>{products?.map((p) => (<SelectItem key={p.id} value={p.id.toString()}>{p.name} (Qtd: {p.quantity}) - R$ {Number(p.price).toFixed(2)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Qtd</Label>
                  <Input type="number" min="1" value={qtyInput} onChange={(e) => setQtyInput(parseInt(e.target.value))} />
                </div>
                <Button onClick={addToCart} variant="secondary">Adicionar</Button>
              </div>
              <div className="border rounded-md p-2 min-h-[100px] max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Qtd</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>{cart.map((item, idx) => (<TableRow key={idx}><TableCell>{item.name}</TableCell><TableCell>{item.quantity}</TableCell><TableCell className="text-right">R$ {(item.price * item.quantity).toFixed(2)}</TableCell></TableRow>))}</TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center text-lg font-bold"><span>Total:</span><span>R$ {cart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</span></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleFinishSale} disabled={createSaleMutation.isPending}>{createSaleMutation.isPending ? "Processando..." : "Finalizar Venda"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}