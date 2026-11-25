import { TestBed } from '@angular/core/testing';
import { httpsCallable } from 'firebase/functions';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { FIREBASE_FUNCTIONS } from '../firebase.config';
import { LocalGameService } from './engine/local-game.service';
import { SyncService } from './sync.service';

// Mock firebase/functions
vi.mock('firebase/functions', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: { success: true } }))),
  };
});

describe('SyncService', () => {
  let service: SyncService;
  let localGameService: any;
  let authService: any;
  let functionsInstance: any;
  let userSubject: BehaviorSubject<any>;
  let localStateSubject: BehaviorSubject<any>;
  let mockMigrateFn: any;
  let mockUploadFn: any;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockMigrateFn = vi.fn(() => Promise.resolve({ data: { success: true } }));
    mockUploadFn = vi.fn(() => Promise.resolve({ data: { success: true } }));

    vi.mocked(httpsCallable).mockImplementation((_functions: any, name: string) => {
      if (name === 'migrateLocalGame') return mockMigrateFn;
      if (name === 'uploadFinishedGame') return mockUploadFn;
      return vi.fn();
    });

    userSubject = new BehaviorSubject(null);
    authService = {
      user$: userSubject.asObservable(),
      isAnonymous: false,
      get currentUser() {
        return userSubject.value;
      },
    };
    localStateSubject = new BehaviorSubject(null);
    localGameService = {
      activeGameId: null as string | null,
      getLocalGames: vi.fn().mockResolvedValue([]),
      loadGame: vi.fn(),
      deleteGame: vi.fn().mockResolvedValue(undefined),
      state$: localStateSubject.asObservable(),
    };
    functionsInstance = {};

    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: LocalGameService, useValue: localGameService },
        { provide: AuthService, useValue: authService },
        { provide: FIREBASE_FUNCTIONS, useValue: functionsInstance },
      ],
    });
    service = TestBed.inject(SyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'migrateLocalGame');
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'uploadFinishedGame');
  });

  it('should sync dormant local games when a non-anonymous user logs in and suppress delete telemetry', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game', status: 'in_progress' };
    const mockFullState = { game: mockGame, allRounds: {} };
    localGameService.getLocalGames.mockResolvedValue([mockGame]);
    localGameService.loadGame.mockResolvedValue(mockFullState);

    // Trigger user login
    userSubject.next({ uid: 'user-123', isAnonymous: false });

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localGameService.getLocalGames).toHaveBeenCalled();
    expect(localGameService.loadGame).toHaveBeenCalledWith('local-123');
    expect(mockMigrateFn).toHaveBeenCalledWith({ gameData: mockFullState });
    expect(localGameService.deleteGame).toHaveBeenCalledWith('local-123', true, { emitTelemetry: false });
  });

  it('should NOT migrate an actively played in_progress local game on state$ emissions or login', async () => {
    const activeGame = { id: 'local-active', name: 'Active Game', status: 'in_progress' };
    const dormantGame = { id: 'local-dormant', name: 'Dormant Game', status: 'in_progress' };
    const activeState = { game: activeGame, allRounds: {} };
    const dormantState = { game: dormantGame, allRounds: {} };

    localGameService.activeGameId = 'local-active';
    localGameService.getLocalGames.mockResolvedValue([activeGame, dormantGame]);
    localGameService.loadGame.mockImplementation((id: string) =>
      Promise.resolve(id === 'local-dormant' ? dormantState : activeState),
    );

    // Login: only dormantGame is migrated, activeGame is untouched
    userSubject.next({ uid: 'user-123', isAnonymous: false });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockMigrateFn).toHaveBeenCalledTimes(1);
    expect(mockMigrateFn).toHaveBeenCalledWith({ gameData: dormantState });
    expect(localGameService.deleteGame).toHaveBeenCalledWith('local-dormant', true, { emitTelemetry: false });

    mockMigrateFn.mockClear();
    localGameService.deleteGame.mockClear();

    // Repeated saveDraft / round updates on active in_progress game must NOT trigger migration
    localStateSubject.next(activeState);
    localStateSubject.next({ ...activeState });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockMigrateFn).not.toHaveBeenCalled();
    expect(localGameService.deleteGame).not.toHaveBeenCalled();
  });

  it('should migrate finished local game once on state$ emission with concurrency guard', async () => {
    const finishedGame = { id: 'local-done', name: 'Done Game', status: 'finished' };
    const finishedState = { game: finishedGame, allRounds: {} };
    localGameService.loadGame.mockResolvedValue(finishedState);

    let resolveMigrate!: () => void;
    mockMigrateFn.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMigrate = () => resolve({ data: { success: true } });
        }),
    );

    userSubject.next({ uid: 'user-123', isAnonymous: false });
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Emit duplicate finished states concurrently
    localStateSubject.next(finishedState);
    localStateSubject.next({ ...finishedState });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockMigrateFn).toHaveBeenCalledTimes(1);
    resolveMigrate();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(localGameService.deleteGame).toHaveBeenCalledTimes(1);
    expect(localGameService.deleteGame).toHaveBeenCalledWith('local-done', true, { emitTelemetry: false });
  });

  it('should upload finished local game for research even if anonymous', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game', status: 'finished' };
    const mockFullState = { game: mockGame, allRounds: {} };
    localGameService.loadGame.mockResolvedValue(mockFullState);

    authService.isAnonymous = true;
    userSubject.next({ uid: 'guest-123', isAnonymous: true });

    // Trigger local state change (game finished)
    localStateSubject.next(mockFullState);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockUploadFn).toHaveBeenCalledWith({ gameData: mockFullState });
    expect(mockMigrateFn).not.toHaveBeenCalled();
  });

  it('should upload for research before migrating when user is logged in and game is finished', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game', status: 'finished' };
    const mockFullState = { game: mockGame, allRounds: {} };
    localGameService.getLocalGames.mockResolvedValue([mockGame]);
    localGameService.loadGame.mockResolvedValue(mockFullState);

    userSubject.next({ uid: 'user-123', isAnonymous: false });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockUploadFn).toHaveBeenCalled();
    expect(mockMigrateFn).toHaveBeenCalled();
    expect(localGameService.deleteGame).toHaveBeenCalled();
  });

  it('should not upload for research if game is not finished', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game', status: 'in_progress' };
    const mockFullState = { game: mockGame, allRounds: {} };

    authService.isAnonymous = true;
    userSubject.next({ uid: 'guest-123', isAnonymous: true });
    localStateSubject.next(mockFullState);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockUploadFn).not.toHaveBeenCalled();
  });

  it('should not delete local game if migration fails', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game', status: 'in_progress' };
    localGameService.getLocalGames.mockResolvedValue([mockGame]);
    localGameService.loadGame.mockResolvedValue({ game: mockGame });

    // Override mock to fail
    mockMigrateFn.mockRejectedValue(new Error('Migration failed'));

    userSubject.next({ uid: 'user-123', isAnonymous: false });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localGameService.deleteGame).not.toHaveBeenCalled();
  });
});
