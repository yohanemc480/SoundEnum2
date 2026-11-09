import type { SearchSound } from '../../Model/Search/SearchTypes.ts';

/** 検索画面から組み合わせへ渡すデータと操作の境界。 */
export interface CompositionActions {
    setEvents(events: SearchSound[]): void;
    add(name: string): void;
    stop(): void;
}

