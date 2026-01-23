import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "../lib/trpc";
// CORREÇÃO 1: Import default
import DashboardLayout from "../components/DashboardLayout"; 
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Plus, Pencil, Trash2, Search, Building2, User } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  company: z.string().optional(),
  manager: z.string().min(2, "Nome do responsável é obrigatório"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  cpfCnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: customers, isLoading } = trpc.customers.list.useQuery();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: "",
      manager: "",
      email: "",
      phone: "",
      cpfCnpj: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
    },
  });

  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      utils.customers.list.invalidate();
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado!");
      utils.customers.list.invalidate();
      setIsDialogOpen(false);
      setEditingId(null);
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente removido.");
      utils.customers.list.invalidate();
    },
  });

  // CORREÇÃO 2: Limpeza de dados antes de enviar para evitar erro de tipo
  const cleanData = (values: z.infer<typeof formSchema>) => {
    return {
      ...values,
      email: values.email || undefined,
      phone: values.phone || undefined,
      cpfCnpj: values.cpfCnpj || undefined,
      company: values.company || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      zipCode: values.zipCode || undefined,
    };
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const cleaned = cleanData(values);
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...cleaned });
    } else {
      createMutation.mutate(cleaned);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingId(customer.id);
    form.reset({
      company: customer.company || "",
      manager: customer.manager,
      email: customer.email || "",
      phone: customer.phone || "",
      cpfCnpj: customer.cpfCnpj || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zipCode: customer.zipCode || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
      deleteMutation.mutate({ id });
    }
  };

  const filteredCustomers = customers?.filter((c) =>
    (c.company?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    c.manager.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome da Empresa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manager"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsável (Obrigatório)</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do Responsável" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                   <FormField
                      control={form.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF / CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="Documento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  
                  <div className="grid grid-cols-3 gap-2">
                    <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name="zipCode" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingId ? "Salvar" : "Criar"}</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por empresa ou responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa / Responsável</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
              ) : filteredCustomers?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center">Nenhum cliente encontrado.</TableCell></TableRow>
              ) : (
                filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        {customer.company && (
                          <div className="flex items-center font-medium text-gray-900">
                            <Building2 className="w-3 h-3 mr-1 text-gray-500" />
                            {customer.company}
                          </div>
                        )}
                        <div className={`flex items-center ${customer.company ? "text-sm text-gray-500" : "font-medium text-gray-900"}`}>
                          <User className="w-3 h-3 mr-1 text-gray-400" />
                          {customer.manager}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{customer.email}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    </TableCell>
                    <TableCell>
                      {customer.city && customer.state ? `${customer.city}/${customer.state}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}