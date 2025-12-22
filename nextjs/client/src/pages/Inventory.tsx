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
import { AlertTriangle, Edit, Package, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

const initialFormData: ComponentFormData = {
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

const componentTypes = [
  { value: "capacitor", label: "Capacitor" },
  { value: "resistor", label: "Resistor" },
  { value: "indutor", label: "Indutor" },
  { value: "mosfet", label: "MOSFET" },
  { value: "ci", label: "CI (Circuito Integrado)" },
  { value: "outros", label: "Outros" },
];

export default function Inventory() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ComponentFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = trpc.useUtils();
  const { data: components, isLoading } = trpc.components.list.useQuery();
  const { data: lowStockComponents } = trpc.components.getLowStock.useQuery();

  const createMutation = trpc.components.create.useMutation({
    onSuccess: () => {
      toast.success("Componente cadastrado com sucesso!");
      utils.components.list.invalidate();
      utils.components.getLowStock.invalidate();
      setIsDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar componente: " + error.message);
    },
  });

  const updateMutation = trpc.components.update.useMutation({
    onSuccess: () => {
      toast.success("Componente atualizado com sucesso!");
      utils.components.list.invalidate();
      utils.components.getLowStock.invalidate();
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar componente: " + error.message);
    },
  });

  const deleteMutation = trpc.components.delete.useMutation({
    onSuccess: () => {
      toast.success("Componente excluído com sucesso!");
      utils.components.list.invalidate();
      utils.components.getLowStock.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao excluir componente: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && formData.id) {
      updateMutation.mutate({ ...formData, id: formData.id });
    } else {
      const { id, ...data } = formData;
      createMutation.mutate(data);
    }
  };

  const handleEdit = (component: any) => {
    setFormData({
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
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este componente?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleNewComponent = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const filteredComponents = components?.filter((c) =>
    searchQuery
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const getStockStatus = (quantity: number, minQuantity: number | null) => {
    if (minQuantity && quantity <= minQuantity) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Baixo</Badge>;
    }
    if (quantity === 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    return <Badge variant="default" className="bg-success text-success-foreground">Normal</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controle de Estoque</h1>
            <p className="text-muted-foreground">Gerencie os componentes eletrônicos</p>
          </div>
          <Button onClick={handleNewComponent}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Componente
          </Button>
        </div>

        {lowStockComponents && lowStockComponents.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Alerta de Estoque Baixo
              </CardTitle>
              <CardDescription>
                {lowStockComponents.length} componente(s) com estoque baixo ou esgotado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockComponents.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Qtd: {c.quantity} (Mín: {c.minQuantity || 0})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Componentes em Estoque</CardTitle>
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
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredComponents && filteredComponents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell className="capitalize">{component.type}</TableCell>
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
                            onClick={() => handleEdit(component)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(component.id)}
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Editar Componente" : "Novo Componente"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Atualize as informações do componente"
                  : "Preencha os dados do novo componente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: any) => setFormData({ ...formData, type: value })}
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
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specifications">Especificações</Label>
                  <Textarea
                    id="specifications"
                    value={formData.specifications}
                    onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                    rows={2}
                    placeholder="Ex: 10uF, 25V, SMD"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minQuantity">Qtd Mínima</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      value={formData.minQuantity}
                      onChange={(e) =>
                        setFormData({ ...formData, minQuantity: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Preço Unit.</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Fabricante</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partNumber">Part Number</Label>
                    <Input
                      id="partNumber"
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Prateleira A, Gaveta 3"
                  />
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
