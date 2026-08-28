---
title: Тригонометрія
description: Тригонометричні функції, основні тотожності, формули зведення й подвійного аргументу.
---

## Означення

У прямокутному трикутнику для гострого кута $\alpha$:

$$\sin \alpha = \frac{\text{протилежний катет}}{\text{гіпотенуза}}, \qquad \cos \alpha = \frac{\text{прилеглий катет}}{\text{гіпотенуза}},$$

$$\operatorname{tg} \alpha = \frac{\sin \alpha}{\cos \alpha}, \qquad \operatorname{ctg} \alpha = \frac{\cos \alpha}{\sin \alpha}.$$

Для довільного кута користуються **одиничним колом**: $\cos \alpha$ — абсциса точки, $\sin \alpha$ — її ордината. Звідси одразу видно, що
$$-1 \le \sin \alpha \le 1, \qquad -1 \le \cos \alpha \le 1.$$

## Таблиця значень

| $\alpha$ | $0^\circ$ | $30^\circ$ | $45^\circ$ | $60^\circ$ | $90^\circ$ |
| --- | --- | --- | --- | --- | --- |
| $\sin \alpha$ | $0$ | $\dfrac12$ | $\dfrac{\sqrt2}{2}$ | $\dfrac{\sqrt3}{2}$ | $1$ |
| $\cos \alpha$ | $1$ | $\dfrac{\sqrt3}{2}$ | $\dfrac{\sqrt2}{2}$ | $\dfrac12$ | $0$ |
| $\operatorname{tg} \alpha$ | $0$ | $\dfrac{\sqrt3}{3}$ | $1$ | $\sqrt3$ | — |

Знати її напам'ять обов'язково. У радіанах: $30^\circ = \dfrac{\pi}{6}$, $45^\circ = \dfrac{\pi}{4}$, $60^\circ = \dfrac{\pi}{3}$, $90^\circ = \dfrac{\pi}{2}$, $180^\circ = \pi$.

## Основні тотожності

$$\sin^2\alpha + \cos^2\alpha = 1$$
$$1 + \operatorname{tg}^2\alpha = \frac{1}{\cos^2\alpha}, \qquad \operatorname{tg}\alpha \cdot \operatorname{ctg}\alpha = 1$$

Перша дає найкорисніші наслідки: $1 - \sin^2\alpha = \cos^2\alpha$ і $1 - \cos^2\alpha = \sin^2\alpha$.

## Знаки за чвертями

| Чверть | $\sin$ | $\cos$ | $\operatorname{tg}$ |
| --- | --- | --- | --- |
| I | $+$ | $+$ | $+$ |
| II | $+$ | $-$ | $-$ |
| III | $-$ | $-$ | $+$ |
| IV | $-$ | $+$ | $-$ |

**Приклад.** $\sin 120^\circ = \dfrac{\sqrt3}{2}$ (друга чверть, синус додатний), а $\cos 150^\circ = -\dfrac{\sqrt3}{2}$ (косинус від'ємний).

## Формули зведення

Правило: якщо кут відкладають від $90^\circ$ або $270^\circ$ — функція **змінюється** на кофункцію ($\sin \leftrightarrow \cos$); від $180^\circ$ або $360^\circ$ — **не змінюється**. Знак беруть за чвертю, у якій опиняється початковий кут.

$$\sin\left(\frac{\pi}{2} - \alpha\right) = \cos \alpha, \qquad \cos(\pi - \alpha) = -\cos \alpha, \qquad \sin(\pi + \alpha) = -\sin\alpha.$$

## Формули додавання і подвійного аргументу

$$\sin(\alpha \pm \beta) = \sin\alpha\cos\beta \pm \cos\alpha\sin\beta$$
$$\cos(\alpha \pm \beta) = \cos\alpha\cos\beta \mp \sin\alpha\sin\beta$$
$$\sin 2\alpha = 2\sin\alpha\cos\alpha, \qquad \cos 2\alpha = \cos^2\alpha - \sin^2\alpha$$

У формулі для косинуса знаки **протилежні** до тих, що в дужках, — це найчастіше плутають.

**Формули пониження степеня** — прямий наслідок:
$$\sin^2\alpha = \frac{1 - \cos 2\alpha}{2}, \qquad \cos^2\alpha = \frac{1 + \cos 2\alpha}{2}.$$

## Найпростіші рівняння

$$\sin x = 0 \iff x = \pi n,\ n \in Z$$
$$\cos x = 1 \iff x = 2\pi n,\ n \in Z$$
$$\cos x = 0 \iff x = \frac{\pi}{2} + \pi n,\ n \in Z$$
$$\sin x = \frac12 \iff x = (-1)^n \frac{\pi}{6} + \pi n,\ n \in Z$$

Загальні розв'язки:
$$\sin x = a \Rightarrow x = (-1)^n \arcsin a + \pi n, \qquad \cos x = a \Rightarrow x = \pm \arccos a + 2\pi n.$$

При $|a| > 1$ розв'язків немає.

## Періоди

$y = \sin x$ і $y = \cos x$ мають період $2\pi$; $y = \operatorname{tg} x$ — період $\pi$.

Для $y = \sin kx$ період дорівнює $\dfrac{2\pi}{|k|}$: у $y = \cos 2x$ період $\pi$, у $y = \sin \dfrac x2$ — $4\pi$.

## Типові помилки

- **$\sin^2\alpha$ читають як $\sin(\alpha^2)$.** Це $(\sin\alpha)^2$.
- **Знаки у формулі косинуса суми.** $\cos(\alpha+\beta) = \cos\alpha\cos\beta - \sin\alpha\sin\beta$ — саме мінус.
- **$\sin 2\alpha = 2\sin\alpha$.** Правильно $2\sin\alpha\cos\alpha$.
- **Загублено $+\pi n$.** Тригонометричне рівняння має нескінченно багато коренів.
- **Градуси й радіани змішані в одній формулі.**
