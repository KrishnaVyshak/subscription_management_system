import { sendData, sendList } from '../../lib/http.js';
import * as payments from '../payments/service.js';
import * as service from './service.js';

export async function list(req, res) {
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
