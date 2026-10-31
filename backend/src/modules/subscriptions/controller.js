import { sendData, sendList } from '../../lib/http.js';
import * as service from './service.js';

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
