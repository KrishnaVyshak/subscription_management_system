import { sendData, sendList } from '../../lib/http.js';
import * as service from './service.js';

export async function list(req, res) {
  const { rows, total } = await service.list(req.query);
  sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total });
}

export async function get(req, res) {
  sendData(res, await service.getDetail(req.params.id));
}

export async function create(req, res) {
  sendData(res, await service.create(req.body, req.user.id), 201);
}

export async function update(req, res) {
  sendData(res, await service.update(req.params.id, req.body));
}

export async function remove(req, res) {
  sendData(res, await service.update(req.params.id, { isActive: false }));
}

export async function setTaxes(req, res) {
  sendData(res, await service.setTaxes(req.params.id, req.body.taxIds));
}

export async function createVariant(req, res) {
  sendData(res, await service.createVariant(req.params.id, req.body, req.user.id), 201);
}

export async function updateVariant(req, res) {
  sendData(res, await service.updateVariant(req.params.id, req.params.variantId, req.body));
}
