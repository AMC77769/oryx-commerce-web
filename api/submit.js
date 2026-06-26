export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, phone, store, revenue, founder, problems, investment } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios' });
  }

  // Mapear "investment" al campo Presupuesto de Notion
  const presupuestoMap = { yes: '3000€+', maybe: '1500-3000€', no: '<800€' };
  const presupuesto = presupuestoMap[investment] || '800-1500€';

  // Mapear "revenue" a etiqueta legible
  const revenueLabels = {
    'lt5k': 'Menos de 5.000€/mes',
    '5-15k': '5.000€–15.000€/mes',
    '15-50k': '15.000€–50.000€/mes',
    '50-150k': '50.000€–150.000€/mes',
    '150k+': 'Más de 150.000€/mes',
  };
  const founderLabels = {
    yes: 'Fundador/a',
    mkt: 'Responsable de marketing/ecommerce',
    dir: 'Equipo de dirección',
    other: 'Otro rol',
  };

  const mensaje = [
    problems || '',
    '\n---',
    `📞 Teléfono: +34 ${phone || '—'}`,
    `🏪 Tienda: ${store || '—'}`,
    `💰 Facturación mensual: ${revenueLabels[revenue] || revenue || '—'}`,
    `👤 Rol: ${founderLabels[founder] || founder || '—'}`,
    `💼 Invertiría +6.000€: ${investment === 'yes' ? 'Sí' : investment === 'maybe' ? 'Quizás' : 'No'}`,
  ].join('\n');

  const today = new Date().toISOString().split('T')[0];

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: process.env.NOTION_DATABASE_ID },
        properties: {
          Nombre: { title: [{ text: { content: name } }] },
          Email: { email: email },
          Empresa: { rich_text: [{ text: { content: store || '' } }] },
          'Tipo de proyecto': { select: { name: 'No estoy seguro' } },
          Presupuesto: { select: { name: presupuesto } },
          Mensaje: { rich_text: [{ text: { content: mensaje.slice(0, 2000) } }] },
          Fecha: { date: { start: today } },
          Estado: { select: { name: 'Nuevo' } },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Notion API error:', JSON.stringify(err));
      return res.status(500).json({ error: 'Error al guardar en Notion' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Error del servidor' });
  }
}
