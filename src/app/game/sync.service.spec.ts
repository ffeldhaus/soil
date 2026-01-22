import { TestBed } from '@angular/core/testing';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { BehaviorSubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { LocalGameService } from './engine/local-game.service';
import { SyncService } from './sync.service';

// Mock @angular/fire/functions
vi.mock('@angular/fire/functions', async (importOriginal) => {
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

  beforeEach(() => {
    userSubject = new BehaviorSubject(null);
    authService = {
      user$: userSubject.asObservable(),
      isAnonymous: false,
    };
    localGameService = {
      getLocalGames: vi.fn().mockResolvedValue([]),
      loadGame: vi.fn(),
      deleteGame: vi.fn().mockResolvedValue(undefined),
      state$: new BehaviorSubject(null).asObservable(),
    };
    functionsInstance = {};

    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: LocalGameService, useValue: localGameService },
        { provide: AuthService, useValue: authService },
        { provide: Functions, useValue: functionsInstance },
      ],
    });
    service = TestBed.inject(SyncService);
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should sync local games when a non-anonymous user logs in', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game' };
    const mockFullState = { game: mockGame, allRounds: {} };
    localGameService.getLocalGames.mockResolvedValue([mockGame]);
    localGameService.loadGame.mockResolvedValue(mockFullState);

    const mockMigrateFn = vi.fn(() => Promise.resolve({ data: { success: true } }));
    vi.mocked(httpsCallable).mockReturnValue(mockMigrateFn as any);

    // Trigger user login
    userSubject.next({ uid: 'user-123', isAnonymous: false });

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localGameService.getLocalGames).toHaveBeenCalled();
    expect(localGameService.loadGame).toHaveBeenCalledWith('local-123');
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'migrateLocalGame');
    expect(mockMigrateFn).toHaveBeenCalledWith({ gameData: mockFullState });
    expect(localGameService.deleteGame).toHaveBeenCalledWith('local-123');
  });

  it('should not sync if user is anonymous', async () => {
    authService.isAnonymous = true;
    userSubject.next({ uid: 'guest-123', isAnonymous: true });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localGameService.getLocalGames).not.toHaveBeenCalled();
  });

  it('should not delete local game if migration fails', async () => {
    const mockGame = { id: 'local-123', name: 'Test Game' };
    localGameService.getLocalGames.mockResolvedValue([mockGame]);
    localGameService.loadGame.mockResolvedValue({ game: mockGame });

    const mockMigrateFn = vi.fn(() => Promise.reject(new Error('Migration failed')));
    vi.mocked(httpsCallable).mockReturnValue(mockMigrateFn as any);

    userSubject.next({ uid: 'user-123', isAnonymous: false });

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(localGameService.deleteGame).not.toHaveBeenCalled();
  });
});
