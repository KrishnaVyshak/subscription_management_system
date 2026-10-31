import { sendData } from '../../lib/http.js';
import * as service from './service.js';

export async function signup(req, res) {
  sendData(res, await service.signup(req.body), 201);
}

export async function me(req, res) {
  sendData(res, await service.getMe(req.user.id));
}

export async function updateMe(req, res) {
  sendData(res, await service.updateMe(req.user.id, req.body));
}

export async function changePassword(req, res) {
  await service.changePassword(req.user.id, req.body);
  sendData(res, { ok: true });
}
