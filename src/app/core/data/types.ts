import type { components } from '../api/api-types';

type Schemas = components['schemas'];

export type UserOut = Schemas['UserOut'];
export type TokenResponse = Schemas['TokenResponse'];
export type RegisterRequest = Schemas['RegisterRequest'];

export type MapResponse = Schemas['MapResponse'];
export type ZoneOut = Schemas['ZoneOut'];
export type SideOut = Schemas['SideOut'];
export type CellOut = Schemas['CellOut'];
export type SuggestionsResponse = Schemas['SuggestionsResponse'];
export type SuggestionOut = Schemas['SuggestionOut'];
export type InjectionResult = Schemas['InjectionResult'];
export type InjectionOrigin = Schemas['InjectionOrigin'];
export type InjectionOut = Schemas['InjectionOut'];
export type HistoryPage = Schemas['HistoryPage'];

export type ScheduleResponse = Schemas['ScheduleResponse'];
export type DoseIn = Schemas['DoseIn'];
export type ReminderOut = Schemas['ReminderOut'];
export type ConfirmResponse = Schemas['ConfirmResponse'];
export type ReminderStatus = Schemas['ReminderStatus'];

export type AssistantMessageOut = Schemas['AssistantMessageOut'];
export type AssistantReply = Schemas['AssistantReply'];
export type LinkOut = Schemas['LinkOut'];
export type LinkCodeOut = Schemas['LinkCodeOut'];

export type CellColor = CellOut['color'];
export type MacroSide = SideOut['side'];
