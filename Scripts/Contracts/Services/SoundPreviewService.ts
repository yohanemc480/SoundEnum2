import type { SearchCandidate } from '../../Model/Search/SearchTypes.ts';
import type { SoundCommand } from '../../FormatSoundCommand.ts';

/** プレビューする音と任意の設定。candidateがnullなら再生側で候補を選ぶ。 */
export interface SoundPreviewRequest {
    name: string;
    candidate: SearchCandidate | null;
    settings?: SoundCommand;
}

/** プレビューとコマンド出力を調整する境界。選択ボタンの表示はViewが担当する。 */
export interface SoundPreviewService {
    play(request: SoundPreviewRequest): Promise<void>;
}
