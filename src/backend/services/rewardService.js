import { getDb } from '../db/database.js';
import { rewardRepository } from '../repositories/rewardRepository.js';
import { pointsRepository } from '../repositories/pointsRepository.js';
import { assert } from '../utils/errors.js';
import { todayStr } from '../utils/dates.js';
import { EXAMPLE_REWARDS } from './exampleData.js';

export function validateReward(data) {
  const name = String(data.name ?? '').trim();
  assert(name.length > 0, 'NAME_REQUIRED', 'Ponle un nombre a la recompensa.');
  assert(name.length <= 40, 'NAME_TOO_LONG', 'El nombre puede tener como mucho 40 caracteres.');
  const cost = Number(data.cost);
  assert(Number.isInteger(cost) && cost >= 10 && cost <= 100000, 'INVALID_COST', 'El precio va de 10 a 100.000 puntos.');
  return { name, icon: String(data.icon || '🎁'), cost };
}

export async function listRewards() {
  const [rewards, balance] = await Promise.all([rewardRepository.findAll(), pointsRepository.balance()]);
  return rewards.map(r => ({ ...r, canAfford: balance >= r.cost, missing: Math.max(0, r.cost - balance) }));
}

export const createReward = data => rewardRepository.create(validateReward(data));
export const updateReward = (id, data) => rewardRepository.update(id, validateReward(data));
export const deleteReward = id => rewardRepository.softDelete(id);

export async function redeemReward(id) {
  return getDb().transaction(async () => {
    const reward = await rewardRepository.findById(id);
    assert(reward && !reward.deleted, 'NOT_FOUND', 'Esa recompensa ya no existe.');
    const balance = await pointsRepository.balance();
    assert(balance >= reward.cost, 'INSUFFICIENT_POINTS', `Te faltan ${reward.cost - balance} puntos.`);
    await pointsRepository.add({ date: todayStr(), amount: -reward.cost, kind: 'reward', rewardId: reward.id });
    return { reward, balance: balance - reward.cost };
  });
}

export const listRedemptions = (limit = 30) => pointsRepository.redemptions(limit);

export async function loadExampleRewards() {
  for (const r of EXAMPLE_REWARDS) await createReward(r);
}
