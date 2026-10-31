import { sendData, sendList } from '../../lib/http.js';
import * as service from './service.js';

export async function list(req, res) {
  const { rows, total } = await service.list(req.query);
  sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total });
}

export async function update(req, res) {
  sendData(res, await service.update(req.user.id, req.params.id, req.body));
}

export async function createStaff(req, res) {
  sendData(res, await service.createStaff(req.body), 201);
}
