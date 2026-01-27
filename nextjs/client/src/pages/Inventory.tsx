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
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Edit, Package, Plus, Search, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// --- TIPOS ---

type ComponentFormData = {
  id?: number;
  name: string;
  type: "capacitor" | "resistor" | "indutor" | "mosfet" | "ci" | "outros";
  description: string;
  specifications: string;
  quantity: number;
  minQuantity: number;
  unitPrice: string;
  location: string;
  manufacturer: string;
  partNumber: string;
};

type ProductFormData = {
  id?: number;
  name: string;
  description: string;
  price: string;
  quantity: number;
  minQuantity: number;
  sku: string;
};

// --- DADOS INICIAIS ---

const initialComponentData: ComponentFormData = {
  name: "",
  type: "outros",
  description: "",
  specifications: "",
  quantity: 0,
  minQuantity: 0,
  unitPrice: "0.00",
  location: "",
  manufacturer: "",
  partNumber: "",
};

const initialProductData: ProductFormData = {
  name: "",
  description: "",
  price: "0.00",
  quantity: 0,
  minQuantity: 0,
  sku: "",
};

const componentTypes = [
  { value: "capacitor", label: "Capacitor" },
  { value: "resistor", label: "Resistor" },
  { value: "indutor", label: "Indutor" },
  { value: "mosfet", label: "MOSFET" },
  { value: "ci", label: "CI (Circuito Integrado)" },
  { value: "outros", label: "Outros" },
];

export default function Inventory() {
  const utils = trpc.useUtils();

  // --- ESTADOS: COMPONENTES ---
  const [isComponentDialogOpen, setIsComponentDialogOpen] = useState(false);
  const [componentForm, setComponentForm] = useState<ComponentFormData>(initialComponentData);
  const [isEditingComponent, setIsEditingComponent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- ESTADOS: PRODUTOS ---
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormData>(initialProductData);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // --- QUERIES ---
  const { data: components, isLoading: isLoadingComponents } = trpc.components.list.useQuery();
  const { data: lowStockComponents } = trpc.components.getLowStock.useQuery();
  const { data: products, isLoading: isLoadingProducts } = trpc.products.list.useQuery();

  // --- MUTAÇÕES: COMPONENTES ---
  const createComponentMutation = trpc.components.create.useMutation({
    onSuccess: () => {
      toast.success("Componente cadastrado com sucesso!");
      utils.components.list.invalidate();
      utils.components.getLowStock.invalidate();
      setIsComponentDialogOpen(false);
      setComponentForm(initialComponentData);
    },
    onError: (error) => toast.error("Erro ao cadastrar componente: " + error.message),
  });

  const updateComponentMutation = trpc.components.update.useMutation({
    onSuccess: () => {
      toast.success("Componente atualizado com sucesso!");
      utils.components.list.invalidate();
      utils.components.getLowStock.invalidate();
      setIsComponentDialogOpen(false);
      setComponentForm(initialComponentData);
      setIsEditingComponent(false);
    },
    onError: (error) => toast.error("Erro ao atualizar componente: " + error.message),
  });

  const deleteComponentMutation = trpc.components.delete.useMutation({
    onSuccess: () => {
      toast.success("Componente excluído com sucesso!");
      utils.components.list.invalidate();
      utils.components.getLowStock.invalidate();
    },
    onError: (error) => toast.error("Erro ao excluir componente: " + error.message),
  });

  // --- MUTAÇÕES: PRODUTOS ---
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produto cadastrado com sucesso!");
      utils.products.list.invalidate();
      setIsProductDialogOpen(false);
      setProductForm(initialProductData);
    },
    onError: (error) => toast.error("Erro ao cadastrar produto: " + error.message),
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso!");
      utils.products.list.invalidate();
      setIsProductDialogOpen(false);
      setProductForm(initialProductData);
      setIsEditingProduct(false);
    },
    onError: (error) => toast.error("Erro ao atualizar produto: " + error.message),
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produto excluído com sucesso!");
      utils.products.list.invalidate();
    },
    onError: (error) => toast.error("Erro ao excluir produto: " + error.message),
  });

  // --- HANDLERS: COMPONENTES ---
  const handleComponentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingComponent && componentForm.id) {
      updateComponentMutation.mutate({ ...componentForm, id: componentForm.id });
    } else {
      const { id, ...data } = componentForm;
      createComponentMutation.mutate(data);
    }
  };

  const handleEditComponent = (component: any) => {
    setComponentForm({
      id: component.id,
      name: component.name || "",
      type: component.type || "outros",
      description: component.description || "",
      specifications: component.specifications || "",
      quantity: component.quantity || 0,
      minQuantity: component.minQuantity || 0,
      unitPrice: component.unitPrice || "0.00",
      location: component.location || "",
      manufacturer: component.manufacturer || "",
      partNumber: component.partNumber || "",
    });
    setIsEditingComponent(true);
    setIsComponentDialogOpen(true);
  };

  const handleDeleteComponent = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este componente?")) {
      deleteComponentMutation.mutate({ id });
    }
  };

  // --- HANDLERS: PRODUTOS ---
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingProduct && productForm.id) {
      updateProductMutation.mutate({ ...productForm, id: productForm.id });
    } else {
      const { id, ...data } = productForm;
      createProductMutation.mutate(data);
    }
  };

  const handleEditProduct = (prod: any) => {
    setProductForm({
      id: prod.id,
      name: prod.name || "",
      description: prod.description || "",
      price: prod.price || "0.00",
      quantity: prod.quantity || 0,
      minQuantity: prod.minQuantity || 0,
      sku: prod.sku || "",
    });
    setIsEditingProduct(true);
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      deleteProductMutation.mutate({ id });
    }
  };

  // --- UTILITÁRIOS ---
  const filteredComponents = components?.filter((c) =>
    searchQuery
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.specifications?.toLowerCase().includes(searchQuery.toLowerCase()) // Busca nas especificações
      : true
  );

  const getStockStatus = (quantity: number, minQuantity: number | null) => {
    if (minQuantity && quantity <= minQuantity) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Baixo</Badge>;
    }
    if (quantity === 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Normal</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
          <p className="text-muted-foreground">Gerencie componentes eletrônicos e produtos de venda</p>
        </div>

        {/* ALERTA DE ESTOQUE BAIXO (COMPONENTES) */}
        {lowStockComponents && lowStockComponents.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                Alerta de Estoque (Componentes)
              </CardTitle>
              <CardDescription className="text-yellow-600/80 dark:text-yellow-400/80">
                {lowStockComponents.length} componente(s) com estoque baixo ou esgotado
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* --- SEÇÃO 1: PRODUTOS DE VENDA (NOVO) --- */}
        <div className="flex items-center justify-between pt-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Produtos de Venda
          </h2>
          <Button onClick={() => {
            setProductForm(initialProductData);
            setIsEditingProduct(false);
            setIsProductDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Estoque de Produtos Finais</CardTitle>
            <CardDescription>Itens comercializados diretamente aos clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingProducts ? (
              <div className="text-center py-8">Carregando produtos...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Preço Venda</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.map((prod) => (
                    <TableRow key={prod.id}>
                      <TableCell className="font-medium">{prod.name}</TableCell>
                      <TableCell>{prod.sku || "-"}</TableCell>
                      <TableCell>R$ {Number(prod.price).toFixed(2)}</TableCell>
                      <TableCell>{prod.quantity}</TableCell>
                      <TableCell>{getStockStatus(prod.quantity, prod.minQuantity)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(prod)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(prod.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!products || products.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Nenhum produto cadastrado para venda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* --- SEÇÃO 2: COMPONENTES ELETRÔNICOS (ORIGINAL) --- */}
        <div className="flex items-center justify-between pt-8 border-t">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Componentes Eletrônicos
            </h2>
          </div>
          <Button variant="secondary" onClick={() => {
            setComponentForm(initialComponentData);
            setIsEditingComponent(false);
            setIsComponentDialogOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Componente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Almoxarifado</CardTitle>
                <CardDescription>
                  {filteredComponents?.length || 0} componente(s) encontrado(s)
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar componentes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingComponents ? (
              <div className="text-center py-8">Carregando componentes...</div>
            ) : filteredComponents && filteredComponents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Especificações</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell className="capitalize">{component.type}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={component.specifications || ""}>
                        {component.specifications || "-"}
                      </TableCell>
                      <TableCell>{component.partNumber || "-"}</TableCell>
                      <TableCell>{component.manufacturer || "-"}</TableCell>
                      <TableCell>{component.quantity}</TableCell>
                      <TableCell>{component.location || "-"}</TableCell>
                      <TableCell>{getStockStatus(component.quantity, component.minQuantity)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditComponent(component)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteComponent(component.id)}
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
                {searchQuery ? "Nenhum componente encontrado" : "Nenhum componente cadastrado"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- DIALOG DE COMPONENTES --- */}
        <Dialog open={isComponentDialogOpen} onOpenChange={setIsComponentDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditingComponent ? "Editar Componente" : "Novo Componente"}
              </DialogTitle>
              <DialogDescription>
                {isEditingComponent
                  ? "Atualize as informações do componente técnico"
                  : "Preencha os dados do novo componente para o almoxarifado"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleComponentSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-name">Nome *</Label>
                    <Input
                      id="comp-name"
                      value={componentForm.name}
                      onChange={(e) => setComponentForm({ ...componentForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-type">Tipo *</Label>
                    <Select
                      value={componentForm.type}
                      onValueChange={(value: any) => setComponentForm({ ...componentForm, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {componentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comp-description">Descrição</Label>
                  <Textarea
                    id="comp-description"
                    value={componentForm.description}
                    onChange={(e) => setComponentForm({ ...componentForm, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comp-specifications">Especificações</Label>
                  <Textarea
                    id="comp-specifications"
                    value={componentForm.specifications}
                    onChange={(e) => setComponentForm({ ...componentForm, specifications: e.target.value })}
                    rows={2}
                    placeholder="Ex: 10uF, 25V, SMD"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-quantity">Quantidade</Label>
                    <Input
                      id="comp-quantity"
                      type="number"
                      value={componentForm.quantity}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, quantity: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-minQuantity">Qtd Mínima</Label>
                    <Input
                      id="comp-minQuantity"
                      type="number"
                      value={componentForm.minQuantity}
                      onChange={(e) =>
                        setComponentForm({ ...componentForm, minQuantity: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-unitPrice">Preço Unit.</Label>
                    <Input
                      id="comp-unitPrice"
                      type="number"
                      step="0.01"
                      value={componentForm.unitPrice}
                      onChange={(e) => setComponentForm({ ...componentForm, unitPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-manufacturer">Fabricante</Label>
                    <Input
                      id="comp-manufacturer"
                      value={componentForm.manufacturer}
                      onChange={(e) => setComponentForm({ ...componentForm, manufacturer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-partNumber">Part Number</Label>
                    <Input
                      id="comp-partNumber"
                      value={componentForm.partNumber}
                      onChange={(e) => setComponentForm({ ...componentForm, partNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comp-location">Localização</Label>
                  <Input
                    id="comp-location"
                    value={componentForm.location}
                    onChange={(e) => setComponentForm({ ...componentForm, location: e.target.value })}
                    placeholder="Ex: Prateleira A, Gaveta 3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsComponentDialogOpen(false);
                    setComponentForm(initialComponentData);
                    setIsEditingComponent(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createComponentMutation.isPending || updateComponentMutation.isPending}
                >
                  {createComponentMutation.isPending || updateComponentMutation.isPending
                    ? "Salvando..."
                    : isEditingComponent
                    ? "Atualizar"
                    : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- DIALOG DE PRODUTOS --- */}
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {isEditingProduct ? "Editar Produto de Venda" : "Novo Produto de Venda"}
              </DialogTitle>
              <DialogDescription>
                {isEditingProduct
                  ? "Atualize as informações do produto"
                  : "Cadastre um novo item disponível para venda"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProductSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="prod-name">Nome do Produto *</Label>
                  <Input
                    id="prod-name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prod-sku">Código / SKU</Label>
                  <Input
                    id="prod-sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="Ex: PROD-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prod-price">Preço de Venda (R$) *</Label>
                    <Input
                      id="prod-price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prod-quantity">Estoque Atual *</Label>
                    <Input
                      id="prod-quantity"
                      type="number"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-minQuantity">Estoque Mínimo (Alerta)</Label>
                  <Input
                    id="prod-minQuantity"
                    type="number"
                    value={productForm.minQuantity}
                    onChange={(e) => setProductForm({ ...productForm, minQuantity: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prod-description">Descrição Detalhada</Label>
                  <Textarea
                    id="prod-description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsProductDialogOpen(false);
                    setProductForm(initialProductData);
                    setIsEditingProduct(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                >
                  {createProductMutation.isPending || updateProductMutation.isPending
                    ? "Salvando..."
                    : isEditingProduct
                    ? "Atualizar"
                    : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}