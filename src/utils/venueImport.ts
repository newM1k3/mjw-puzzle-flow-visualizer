// venueImport.ts — list a signed-in user's venue rooms that carry an AI Room
// Generator document, using the same membership → venue → rooms resolution as
// the other spine tools (Locks, Layout, Logic).

import pb from '../lib/pocketbase';
import { isGeneratedRoomPayload, type GeneratedRoomDoc } from './generatedFlow';

export interface VenueRoomOption {
  experienceId: string;
  title: string;
  room: GeneratedRoomDoc;
}

export async function listGeneratedVenueRooms(): Promise<VenueRoomOption[]> {
  if (!pb || !pb.authStore.isValid) return [];
  const uid = pb.authStore.record?.id;
  if (!uid) return [];

  const memberships = await pb.collection('memberships').getFullList({
    filter: `user = '${uid}' && status = 'active'`,
    requestKey: null,
  });

  for (const membership of memberships) {
    const orgId = membership.organization as string;
    const projects = await pb.collection('projects').getFullList({
      filter: `organization = '${orgId}'`,
      requestKey: null,
    });
    const venue = projects[0];
    if (!venue) continue;

    const experiences = await pb.collection('experiences').getFullList({
      filter: `project = '${venue.id}' && status != 'retired'`,
      requestKey: null,
    });

    return experiences
      .filter((e) => isGeneratedRoomPayload(e.design_parameters))
      .map((e) => ({
        experienceId: e.id as string,
        title: (e.title as string) || 'Untitled room',
        room: (e.design_parameters as { room: GeneratedRoomDoc }).room,
      }));
  }
  return [];
}
