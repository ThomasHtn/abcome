import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthSession } from '@core/auth/auth-session';

import { LoginPage } from './login';
import { LOGIN_MESSAGES, LOGIN_SUCCESS_DELAY_MS } from './login.constants';

describe('LoginPage', () => {
  /**
   * Stands in for the server session.
   */
  let signIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signIn = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthSession, useValue: { signIn } }],
    });
  });

  afterEach(() => vi.useRealTimers());

  /**
   * Renders the screen, with `?retour=` when given, and returns its root element.
   */
  function render(retour?: string): HTMLElement {
    const fixture = TestBed.createComponent(LoginPage);
    if (retour !== undefined) {
      fixture.componentRef.setInput('retour', retour);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /**
   * Types a password into the field.
   */
  function type(element: HTMLElement, password: string): HTMLInputElement {
    const input = element.querySelector<HTMLInputElement>('#login-password')!;
    input.value = password;
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
    return input;
  }

  /**
   * Submits the form and lets the login promise settle.
   */
  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    await Promise.resolve();
    TestBed.tick();
  }

  it('keeps the button disabled until a password is typed', () => {
    const element = render();
    const button = element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.disabled).toBe(true);

    type(element, 'secret');
    expect(button.disabled).toBe(false);
  });

  it('shows the mascot hiding his eyes while a hidden password is typed', () => {
    const element = render();
    const input = type(element, 'secret');
    input.dispatchEvent(new Event('focus'));
    TestBed.tick();

    expect(element.querySelector('app-mascot img')!.getAttribute('src')).toContain('hiding.svg');
  });

  it('reveals the password with the eye button', () => {
    const element = render();
    const input = type(element, 'secret');
    element.querySelector<HTMLButtonElement>('.login__toggle')!.click();
    TestBed.tick();

    expect(input.type).toBe('text');
  });

  it('opens the notebook after the jump when the password is right', async () => {
    vi.useFakeTimers();
    signIn.mockResolvedValue(undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const element = render();
    type(element, 'secret');

    await submit(element);
    expect(signIn).toHaveBeenCalledWith('secret');
    expect(element.querySelector('#login-help')!.textContent).toContain(LOGIN_MESSAGES.success);
    expect(navigate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(LOGIN_SUCCESS_DELAY_MS);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('reopens the page the session expired on, never another site', async () => {
    vi.useFakeTimers();
    signIn.mockResolvedValue(undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    const element = render('/mots/nouveau?mot=lapin');
    type(element, 'secret');
    await submit(element);
    vi.advanceTimersByTime(LOGIN_SUCCESS_DELAY_MS);
    expect(navigate).toHaveBeenLastCalledWith('/mots/nouveau?mot=lapin');

    const other = render('//example.com');
    type(other, 'secret');
    await submit(other);
    vi.advanceTimersByTime(LOGIN_SUCCESS_DELAY_MS);
    expect(navigate).toHaveBeenLastCalledWith('/');
  });

  it('explains a wrong password and flags the field', async () => {
    signIn.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { code: 'INVALID_CREDENTIALS' } }),
    );
    const element = render();
    const input = type(element, 'nope');

    await submit(element);
    const help = element.querySelector('#login-help')!;
    expect(help.textContent).toContain(LOGIN_MESSAGES.invalid);
    expect(help.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
