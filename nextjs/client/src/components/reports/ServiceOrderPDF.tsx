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
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#e0e0e0',
    padding: 4,
    marginTop: 10,
    marginBottom: 5,
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
    padding: 5,
    marginBottom: 10
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row'
  },
  tableColHeader: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f3f3f3',
    padding: 5
  },
  tableCol: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold'
  },
  tableCell: {
    fontSize: 8
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 2
  },
  totalLabel: {
    width: 100,
    textAlign: 'right',
    marginRight: 10,
    fontSize: 9,
    fontWeight: 'bold'
  },
  totalValue: {
    width: 80,
    textAlign: 'right',
    fontSize: 9
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50
  },
  signatureBox: {
    width: '45%',
    borderTopWidth: 1,
    borderTopColor: '#000',
    alignItems: 'center',
    paddingTop: 5
  },
  // --- ALTERAÇÕES AQUI PARA IMAGENS FULL WIDTH ---
  imagesContainer: {
    flexDirection: 'column', // Empilha as imagens verticalmente
    marginTop: 10,
    gap: 15
  },
  imageWrapper: {
    width: '100%', // Ocupa toda a largura disponível
    height: 400,   // Altura aumentada para exibir bem a imagem
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
    objectFit: 'contain' // Garante que a imagem inteira apareça sem distorção
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
          <Text style={styles.label}>R. FRANCISCO PAES, 229, CENTRO | CEP: 12210-100</Text>
          <Text style={styles.label}>São José dos Campos - SP</Text>
          <Text style={styles.label}>Email: controlbrasil.sac@gmail.com | Tel: (12) 99637-1799</Text>
        </View>

        <View style={styles.osTitleBox}>
          <Text style={{ fontSize: 10, marginBottom: 5 }}>Ordem de Serviço</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{order.orderNumber}</Text>
          <Text style={{ fontSize: 7, marginTop: 5 }}>EMITIDO EM: {formatDate(new Date())}</Text>
        </View>
      </View>

      {/* --- DADOS DO CLIENTE --- */}
      <Text style={styles.sectionTitle}>Dados do Cliente</Text>
      <View style={styles.box}>
        <View style={styles.row}>
          <View style={[styles.col, { width: '50%' }]}>
            <Text style={styles.label}>Cliente / Empresa:</Text>
            <Text style={styles.value}>{customer?.name || '-'}</Text>
          </View>
          <View style={[styles.col, { width: '25%' }]}>
            <Text style={styles.label}>CPF/CNPJ:</Text>
            <Text style={styles.value}>{customer?.cpfCnpj || '-'}</Text>
          </View>
          <View style={[styles.col, { width: '25%' }]}>
            <Text style={styles.label}>Telefone:</Text>
            <Text style={styles.value}>{customer?.phone || '-'}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.col, { width: '50%' }]}>
            <Text style={styles.label}>Endereço:</Text>
            <Text style={styles.value}>
              {customer?.address || ''}, {customer?.city || ''} - {customer?.state || ''}
            </Text>
          </View>
          <View style={[styles.col, { width: '50%' }]}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{customer?.email || '-'}</Text>
          </View>
        </View>
      </View>

      {/* --- DADOS DO EQUIPAMENTO --- */}
      <Text style={styles.sectionTitle}>Equipamento</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Equipamento</Text></View>
          <View style={[styles.tableColHeader, { width: '40%' }]}><Text style={styles.tableCellHeader}>Parecer Técnico (Diagnóstico)</Text></View>
          <View style={[styles.tableColHeader, { width: '40%' }]}><Text style={styles.tableCellHeader}>Defeitos Apresentados</Text></View>
        </View>
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: '20%' }]}>
            <Text style={styles.tableCell}>{order.equipmentDescription || '-'}</Text>
          </View>
          <View style={[styles.tableCol, { width: '40%' }]}>
            <Text style={styles.tableCell}>{order.diagnosis || '-'}</Text>
          </View>
          <View style={[styles.tableCol, { width: '40%' }]}>
            <Text style={styles.tableCell}>{order.reportedIssue || '-'}</Text>
          </View>
        </View>
      </View>

      {/* --- SERVIÇOS EXECUTADOS --- */}
      <Text style={styles.sectionTitle}>Serviços Executados</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={[styles.tableColHeader, { width: '10%' }]}><Text style={styles.tableCellHeader}>Item</Text></View>
          <View style={[styles.tableColHeader, { width: '50%' }]}><Text style={styles.tableCellHeader}>Descrição</Text></View>
          <View style={[styles.tableColHeader, { width: '10%' }]}><Text style={styles.tableCellHeader}>Qtd</Text></View>
          <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCellHeader}>V. Unit</Text></View>
          <View style={[styles.tableColHeader, { width: '15%' }]}><Text style={styles.tableCellHeader}>Total</Text></View>
        </View>

        {/* Linha de Mão de Obra */}
        <View style={styles.tableRow}>
          <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>01</Text></View>
          <View style={[styles.tableCol, { width: '50%' }]}><Text style={styles.tableCell}>{order.solution || "Mão de Obra Técnica Especializada"}</Text></View>
          <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>1</Text></View>
          <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(order.laborCost)}</Text></View>
          <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(order.laborCost)}</Text></View>
        </View>
      </View>

      {/* --- TOTAIS --- */}
      <View style={styles.totalsContainer}>
        <View style={{ width: 250 }}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Serviços:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.laborCost)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Produtos:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.partsCost)}</Text>
          </View>
          <View style={[styles.totalRow, { borderBottomWidth: 0, marginTop: 5 }]}>
            <Text style={[styles.totalLabel, { fontSize: 11 }]}>TOTAL ORDEM:</Text>
            <Text style={[styles.totalValue, { fontSize: 11, fontWeight: 'bold' }]}>{formatCurrency(order.totalCost)}</Text>
          </View>
        </View>
      </View>

      {/* --- IMAGENS / FOTOS --- */}
      {order.images && order.images.length > 0 ? (
        <View break={false} style={{ marginTop: 20 }}>
           <Text style={styles.sectionTitle}>Fotos / Anexos</Text>
           {/* Contêiner agora em coluna */}
           <View style={styles.imagesContainer}>
             {order.images.map((imgUrl: string, index: number) => (
                <View key={index} style={styles.imageWrapper} wrap={false}>
                   <Image 
                     src={imgUrl} 
                     style={styles.image} 
                   />
                </View>
             ))}
           </View>
        </View>
      ) : null}

      {/* --- RODAPÉ / ASSINATURAS --- */}
      <View style={{ marginTop: 30, marginBottom: 10 }}>
         <Text style={styles.label}>Técnico Responsável: {technician?.name || 'Não informado'}</Text>
         <Text style={styles.label}>Garantia: 3 meses para os serviços executados.</Text>
      </View>

      <View style={styles.signaturesContainer}>
        <View style={styles.signatureBox}>
          <Text style={styles.label}>Assinatura do Cliente</Text>
          <Text style={{ marginTop: 20, fontSize: 8 }}>{customer?.name || 'Cliente'}</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.label}>Assinatura do Responsável</Text>
          <Text style={{ marginTop: 20, fontSize: 8 }}>CONTROL BRASIL</Text>
        </View>
      </View>

    </Page>
  </Document>
);