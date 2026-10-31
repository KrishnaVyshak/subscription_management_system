import { sendData, sendList } from '../../lib/http.js';
import * as service from './service.js';

export async function list(req, res) {
  const { rows, total } = await service.list(req.query);
  sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total });
}

export async function get(req, res) {
  sendData(res, await service.get(req.params.id));
}

export async function create(req, res) {
  sendData(res, await service.create(req.body, req.user.id), 201);
}

export async function update(req, res) {
  sendData(res, await service.update(req.params.id, req.body));
}

export async function invite(req, res) {
  sendData(res, await service.invite(req.params.id), 201);
}
