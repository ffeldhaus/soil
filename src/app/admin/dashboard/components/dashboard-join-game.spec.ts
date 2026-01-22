import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardJoinGameComponent } from './dashboard-join-game';

describe('DashboardJoinGameComponent', () => {
  let component: DashboardJoinGameComponent;
  let fixture: ComponentFixture<DashboardJoinGameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, DashboardJoinGameComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardJoinGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit joinGame event on submit', () => {
    const emitSpy = vi.spyOn(component.joinGame, 'emit');
    component.joinConfig.gameId = 'TEST-123';
    component.joinConfig.pin = '1234';
    component.onJoin();
    expect(emitSpy).toHaveBeenCalledWith({ gameId: 'TEST-123', pin: '1234' });
  });
});
