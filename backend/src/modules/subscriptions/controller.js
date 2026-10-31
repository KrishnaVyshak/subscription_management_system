import { sendData, sendList } from '../../lib/http.js';
import { invoiceNextPeriod } from '../billing/service.js';
import { getDetail as getInvoice } from '../invoices/service.js';
import * as discounts from '../discounts/service.js';
import * as service from './service.js';

export async function attachDiscount(req, res) {
  await discounts.attach(req.params.id, req.body.discountId, req.user.id);
  sendData(res, await service.getDetail(req.params.id, req.user), 201);
}

export async function detachDiscount(req, res) {
  await discounts.detach(req.params.id, req.params.discountId);
  sendData(res, await service.getDetail(req.params.id, req.user));
}

export async function invoiceNow(req, res) {
  const invoiceId = await invoiceNextPeriod(req.params.id, req.user.id);
  sendData(res, await getInvoice(invoiceId), 201);
}

export async function list(req, res) {
  const { rows, total, statusCounts } = await service.list(req.query);
  sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total }, { statusCounts });
}

export async function get(req, res) {
  sendData(res, await service.getDetail(req.params.id, req.user));
}

export async function create(req, res) {
  sendData(res, await service.create(req.body, req.user), 201);
}

export async function update(req, res) {
  sendData(res, await service.update(req.params.id, req.body, req.user));
}

export async function transition(req, res) {
  sendData(res, await service.transition(req.params.id, req.body, req.user));
}

export async function renew(req, res) {
  sendData(res, await service.renew(req.params.id, req.user));
}
