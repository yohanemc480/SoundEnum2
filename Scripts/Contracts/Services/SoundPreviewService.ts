import type { SearchCandidate } from '../../Model/Search/SearchTypes.ts';
import type { SoundCommand } from '../../Model/Command/FormatSoundCommand.ts';

/** プレビューする音と任意の設定。candidateがnullなら再生側で候補を選ぶ。 */
export interface SoundPreviewRequest {
    name: string;
    candidate: SearchCandidate | null;
    /** 明示的に選択した候補の0始まりの番号。 */
    candidateIndex?: number;
    settings?: SoundCommand;
}

/** プレビューとコマンド出力を調整する境界。選択ボタンの表示はViewが担当する。 */
export interface SoundPreviewService {
    play(request: SoundPreviewRequest): Promise<void>;
}
