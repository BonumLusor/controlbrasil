import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

// Tipos baseados no seu schema e queries
interface PDFProps {
  order: any; 
  customer: any;
  technician: any;
}

// Estilos
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333'
  },
  headerContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10
  },
  logo: {
    width: 80,
    height: 50,
    marginRight: 15,
    objectFit: 'contain'
  },
  companyInfo: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  label: {
    fontSize: 8,
    color: '#666',
    marginBottom: 2
  },
  labelBold: {
    fontSize: 8,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 2
  },
  value: {
    fontSize: 9,
    marginBottom: 4
  },
  osTitleBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 5,
    width: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0'
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
    padding: 5,
    marginTop: 15,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2
  },
  col: {
    flexDirection: 'column',
    marginRight: 10
  },
  box: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    borderRadius: 2
  },
  // --- Tabela Simplificada ---
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: '#fff',
    padding: 6,
    alignItems: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    minHeight: 25, // Altura mínima um pouco maior para conforto
    paddingVertical: 4
  },
  // Colunas Ajustadas (2 Colunas apenas)
  colDesc: { width: '80%', padding: 4 },
  colTotal: { width: '20%', padding: 4, textAlign: 'right' },
  
  cellText: { fontSize: 9 },
  cellTextBold: { fontSize: 9, fontWeight: 'bold' },
  cellTextSmall: { fontSize: 8, color: '#555' },

  // --- TOTAIS ---
  totalsBox: {
    width: '100%',
    marginTop: 5,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderStyle: 'dashed',
    paddingBottom: 2
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderStyle: 'solid'
  },
  totalLabel: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold'
  },
  totalValue: {
    fontSize: 10,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'right'
  },
  
  // Rodapé
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    alignItems: 'center',
    paddingTop: 5
  },
  imagesContainer: {
    flexDirection: 'column',
    marginTop: 10,
    gap: 10
  },
  imageWrapper: {
    width: '100%',
    height: 300,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  }
});

const formatCurrency = (value: string | number) => {
  const num = Number(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(num) ? 0 : num);
};

const formatDate = (dateString: string | Date | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export const ServiceOrderPDF = ({ order, customer, technician }: PDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* --- CABEÇALHO --- */}
      <View style={styles.headerContainer}>
        <Image style={styles.logo} src="/logo.png" />
        
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>CONTROL BRASIL</Text>
          <Text style={styles.label}>CNPJ: 50.876.737/0001-40</Text>
          <Text style={styles.label}>R. FRANCISCO PAES, 229, CENTRO</Text>
          <Text style={styles.label}>CEP: 12210-100 | São José dos Campos - SP</Text>
          <Text style={styles.label}>Email: controlbrasil.sac@gmail.com</Text>
          <Text style={styles.label}>Tel: (12) 99637-1799</Text>
        </View>

        <View style={styles.osTitleBox}>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>Ordem de Serviço</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{order.orderNumber}</Text>
          <Text style={{ fontSize: 7, marginTop: 5 }}>EMISSÃO: {formatDate(new Date())}</Text>
          <Text style={{ fontSize: 7 }}>ENTRADA: {formatDate(order.receivedDate)}</Text>
        </View>
      </View>

      {/* --- DADOS DO CLIENTE --- */}
      <Text style={styles.sectionTitle}>Dados do Cliente</Text>
      <View style={styles.box}>
        <View style={styles.row}>
          <View style={[styles.col, { width: '55%' }]}>
            <Text style={styles.label}>Cliente / Empresa</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{customer?.company || customer?.name || '-'}</Text>
          </View>
          <View style={[styles.col, { width: '45%' }]}>
            <Text style={styles.label}>Responsável</Text>
            <Text style={styles.value}>{customer?.manager || '-'}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.col, { width: '25%' }]}>
            <Text style={styles.label}>CPF/CNPJ</Text>
            <Text style={styles.value}>{customer?.cpfCnpj || '-'}</Text>
          </View>
           <View style={[styles.col, { width: '30%' }]}>
            <Text style={styles.label}>Telefone</Text>
            <Text style={styles.value}>{customer?.phone || '-'}</Text>
          </View>
           <View style={[styles.col, { width: '45%' }]}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{customer?.email || '-'}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.col, { width: '100%' }]}>
            <Text style={styles.label}>Endereço</Text>
            <Text style={styles.value}>
              {customer?.address || ''}, {customer?.city || ''} - {customer?.state || ''} {customer?.zipCode ? `(${customer?.zipCode})` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* --- DETALHAMENTO DE EQUIPAMENTOS --- */}
      <Text style={styles.sectionTitle}>Equipamentos e Diagnósticos</Text>
      {order.equipments && order.equipments.length > 0 ? (
        order.equipments.map((eq: any, index: number) => (
          <View key={index} style={styles.box}>
             {/* Header do Item */}
             <View style={{ backgroundColor: '#f9f9f9', padding: 4, marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 9 }}>Item #{index + 1} - {eq.equipment || 'Equipamento'} {eq.brand ? `- ${eq.brand}` : ''} {eq.model ? `- ${eq.model}` : ''}</Text>
                <Text style={{ fontSize: 7, color: '#666' }}>N/S: {eq.serialNumber || 'N/A'}</Text>
             </View>

             {/* Corpo do Item */}
             <View style={styles.row}>
                <View style={[styles.col, { width: '100%', marginBottom: 4 }]}>
                   <Text style={styles.labelBold}>Defeito Relatado:</Text>
                   <Text style={styles.value}>{eq.reportedIssue || 'Não informado.'}</Text>
                </View>
             </View>

             <View style={styles.row}>
                <View style={[styles.col, { width: '100%', marginBottom: 4 }]}>
                   <Text style={styles.labelBold}>Diagnóstico Técnico:</Text>
                   <Text style={styles.value}>{eq.diagnosis || 'Em análise.'}</Text>
                </View>
             </View>
             
             <View style={styles.row}>
                <View style={[styles.col, { width: '100%' }]}>
                   <Text style={styles.labelBold}>Solução Aplicada:</Text>
                   <Text style={styles.value}>{eq.solution || 'Em andamento.'}</Text>
                </View>
             </View>
          </View>
        ))
      ) : (
          <View style={styles.box}>
             <Text style={styles.value}>Nenhum equipamento registrado detalhadamente.</Text>
          </View>
      )}

      {/* --- TABELA FINANCEIRA ITEMIZADA (SIMPLIFICADA) --- */}
      <Text style={styles.sectionTitle}>Detalhamento de Valores</Text>
      
      <View style={styles.table}>
        {/* Header da Tabela - SEM QTD E SEM V. UNIT */}
        <View style={styles.tableHeader}>
          <Text style={[styles.cellTextBold, styles.colDesc, { color: '#fff' }]}>Descrição do Serviço / Equipamento</Text>
          <Text style={[styles.cellTextBold, styles.colTotal, { color: '#fff' }]}>Valor Total</Text>
        </View>

        {/* Linhas da Tabela */}
        {order.equipments && order.equipments.map((eq: any, idx: number) => {
            const labor = parseFloat(eq.laborCost || "0");
            const parts = parseFloat(eq.partsCost || "0");
            const totalItem = labor + parts;

            return (
              <View style={styles.tableRow} key={idx}>
                {/* Coluna Descrição */}
                <View style={styles.colDesc}>
                    <Text style={styles.cellTextBold}>
                      {`#${idx + 1} ${eq.equipment || 'Equipamento'} ${eq.brand || ''}`}
                    </Text>
                    {eq.solution ? (
                      <Text style={[styles.cellTextSmall, { marginTop: 2 }]}>
                        {eq.solution}
                      </Text>
                    ) : null}
                </View>
                
                {/* Coluna Valor Total (Soma Mão de Obra + Peças) */}
                <Text style={[styles.cellText, styles.colTotal]}>{formatCurrency(totalItem)}</Text>
              </View>
            );
        })}
        
        {/* Fallback caso não tenha equipamentos */}
        {(!order.equipments || order.equipments.length === 0) && (
           <View style={styles.tableRow}>
             <Text style={[styles.cellText, styles.colDesc]}>Serviço Geral</Text>
             <Text style={[styles.cellText, styles.colTotal]}>{formatCurrency(order.totalCost)}</Text>
           </View>
        )}
      </View>

      {/* --- TOTAIS (FULL WIDTH) --- */}
      <View style={styles.totalsBox}>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal Serviços:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.laborCost)}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Impostos (6%):</Text>
            <Text style={styles.totalValue}>{formatCurrency((parseFloat(order.laborCost) * 0.06) || 0)}</Text>
          </View>
          
          <View style={styles.totalRowFinal}>
            <Text style={[styles.totalLabel, { fontSize: 12 }]}>TOTAL GERAL:</Text>
            <Text style={[styles.totalValue, { fontSize: 12 }]}>{formatCurrency(order.totalCost)}</Text>
          </View>
      </View>

       {/* --- OBSERVAÇÕES E GARANTIA --- */}
       <View style={{ marginTop: 20, padding: 8, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
         <Text style={styles.labelBold}>Observações Gerais:</Text>
         <Text style={{ fontSize: 8, marginBottom: 8, lineHeight: 1.4 }}>{order.notes || 'Sem observações adicionais.'}</Text>
         
         <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 5 }}>
            <Text style={styles.labelBold}>Técnico Responsável: </Text>
            <Text style={{ fontSize: 8 }}>{technician?.name || 'Não informado'}</Text>
         </View>
         
         <Text style={{ fontSize: 7, marginTop: 4, color: '#666', fontStyle: 'italic' }}>
            Garantia de 90 dias para os serviços executados e peças substituídas, conforme Art. 26 do Código de Defesa do Consumidor.
         </Text>
      </View>

      {/* --- ASSINATURAS --- */}
      <View style={styles.signaturesContainer}>
        <View style={styles.signatureBox}>
          <Text style={styles.label}>Aprovação do Cliente</Text>
          <Text style={{ marginTop: 25, fontSize: 8, fontWeight: 'bold' }}>{customer?.company || customer?.name || 'Cliente'}</Text>
          <Text style={{ fontSize: 7, color: '#999' }}>CPF/CNPJ: {customer?.cpfCnpj}</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.label}>Responsável Técnico</Text>
          <Text style={{ marginTop: 25, fontSize: 8, fontWeight: 'bold' }}>CONTROL BRASIL</Text>
          <Text style={{ fontSize: 7, color: '#999' }}>Departamento Técnico</Text>
        </View>
      </View>

      {/* --- RELATÓRIO FOTOGRÁFICO --- */}
      {order.images && order.images.length > 0 ? (
        <View break={true} style={{ marginTop: 20 }}>
           <Text style={styles.sectionTitle}>Anexo Fotográfico</Text>
           <View style={styles.imagesContainer}>
             {order.images.map((imgUrl: string, index: number) => (
                <View key={index} style={styles.imageWrapper} wrap={false}>
                   <Image 
                     src={imgUrl} 
                     style={styles.image} 
                   />
                   <Text style={{ fontSize: 8, color: '#666', marginTop: 4 }}>Imagem {index + 1}</Text>
                </View>
             ))}
           </View>
        </View>
      ) : null}

    </Page>
  </Document>
);