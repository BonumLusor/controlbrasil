import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, ShoppingCart, Search, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Sales() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [cart, setCart] = useState<{ productId: number; name: string; price: number; quantity: number }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qtyInput, setQtyInput] = useState(1);

  const utils = trpc.useUtils();
  const { data: sales } = trpc.sales.list.useQuery(); // Você precisa criar este router
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: products } = trpc.products.list.useQuery(); // Você precisa criar este router

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Venda registrada com sucesso!");
      utils.sales.list.invalidate();
      utils.products.list.invalidate(); // Atualiza estoque
      utils.reports.monthly.invalidate(); // Atualiza financeiro
      setIsDialogOpen(false);
      setCart([]);
      setSelectedCustomer("");
    },
    onError: (err) => toast.error("Erro ao registrar venda: " + err.message),
  });

  const addToCart = () => {
    if (!selectedProduct) return;
    const prod = products?.find((p) => p.id.toString() === selectedProduct);
    if (!prod) return;

    if (prod.quantity < qtyInput) {
      toast.error("Quantidade indisponível em estoque!");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === prod.id ? { ...item, quantity: item.quantity + qtyInput } : item
        );
      }
      return [...prev, { productId: prod.id, name: prod.name, price: Number(prod.price), quantity: qtyInput }];
    });
    setQtyInput(1);
  };

  const handleFinishSale = () => {
    if (!selectedCustomer || cart.length === 0) {
      toast.error("Selecione um cliente e adicione produtos.");
      return;
    }
    
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    createSaleMutation.mutate({
      customerId: parseInt(selectedCustomer),
      items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })),
      totalAmount: total,
      paymentMethod: "dinheiro" // Simplificado, pode adicionar um select para isso
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vendas de Produtos</h1>
            <p className="text-muted-foreground">Registre saídas de produtos e gere receita</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Venda
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>#{sale.id}</TableCell>
                    <TableCell>{sale.customerName || "Cliente não identificado"}</TableCell>
                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>R$ {Number(sale.totalAmount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant="outline" className="bg-green-500/10 text-green-500">Concluído</Badge></TableCell>
                  </TableRow>
                ))}
                {!sales?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">Nenhuma venda registrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog de Nova Venda */}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2 p-4 border rounded-md bg-muted/20">
                <div className="flex-1 space-y-2">
                  <Label>Produto</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Adicionar produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} (Estoque: {p.quantity}) - R$ {Number(p.price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Qtd</Label>
                  <Input type="number" min="1" value={qtyInput} onChange={(e) => setQtyInput(parseInt(e.target.value))} />
                </div>
                <Button onClick={addToCart} variant="secondary">Adicionar</Button>
              </div>

              {/* Carrinho */}
              <div className="border rounded-md p-2 min-h-[100px] max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="text-right">R$ {(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span>R$ {cart.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleFinishSale} disabled={createSaleMutation.isPending}>
                {createSaleMutation.isPending ? "Processando..." : "Finalizar Venda"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}