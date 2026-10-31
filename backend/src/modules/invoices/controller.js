import { toCsv } from '../../lib/csv.js';
import { todayIST } from '../../lib/dates.js';
import { sendData, sendList } from '../../lib/http.js';
import * as payments from '../payments/service.js';
import * as service from './service.js';

export async function list(req, res) {
  if (req.query.format === 'csv') {
    const rows = await service.listAll(req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${todayIST()}.csv"`);
    return res.send(toCsv(rows, service.CSV_COLUMNS));
  }
  const { rows, total, statusCounts, totals } = await service.list(req.query);
  sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total }, { statusCounts, totals });
}

export async function get(req, res) {
  sendData(res, await service.getDetail(req.params.id));
}

export async function confirm(req, res) {
  sendData(res, await service.confirm(req.params.id));
}

export async function cancel(req, res) {
  sendData(res, await service.cancel(req.params.id));
}

export async function recordPayment(req, res) {
  await payments.record(req.params.id, req.body, req.user);
  sendData(res, await service.getDetail(req.params.id), 201);
}

export async function send(req, res) {
  sendData(res, await service.send(req.params.id));
}

export async function sendBulk(req, res) {
  sendData(res, await service.sendBulk(req.body.invoiceIds));
}

export async function remind(req, res) {
  sendData(res, await service.remind(req.params.id));
}

export async function pdf(req, res) {
  const { buffer, fileName } = await service.pdf(req.params.id);
  sendPdf(res, buffer, fileName);
}

export function sendPdf(res, buffer, fileName) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  res.send(buffer);
}
