import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LanguageSwitcher } from "@/components";
import {
  APP_NAME,
  I18nProvider,
  LOCALE_STORAGE_KEY,
  useI18n,
} from "@/i18n";

function Probe() {
  const { locale, messages } = useI18n();

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span>{messages.home.subtitle}</span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <I18nProvider>
      <LanguageSwitcher />
      <Probe />
    </I18nProvider>
  );
}

describe("I18nProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      configurable: true,
    });
    Object.defineProperty(window.navigator, "language", {
      value: "en-US",
      configurable: true,
    });
    (window.localStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  it("should prefer French when the browser language is French", async () => {
    Object.defineProperty(window.navigator, "language", {
      value: "fr-FR",
      configurable: true,
    });

    renderWithProvider();

    await screen.findByText(
      "Transformez n'importe quelle recette en guide intelligent étape par étape"
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(document.title).toBe(APP_NAME);
    expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
      LOCALE_STORAGE_KEY,
      "fr"
    );
  });

  it("should fall back to English when the browser does not prefer French", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
    });

    expect(
      screen.getByText("Turn any recipe into a smart step-by-step guide")
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("should restore the persisted locale from localStorage", async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValue("fr");

    renderWithProvider();

    await screen.findByText(
      "Transformez n'importe quelle recette en guide intelligent étape par étape"
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("fr");
  });

  it("should switch languages and persist the selection", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
    });

    fireEvent.click(screen.getByRole("button", { name: "Français" }));

    await screen.findByText(
      "Transformez n'importe quelle recette en guide intelligent étape par étape"
    );
    expect(screen.getByTestId("locale")).toHaveTextContent("fr");
    expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
      LOCALE_STORAGE_KEY,
      "fr"
    );

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    await screen.findByText("Turn any recipe into a smart step-by-step guide");
    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(window.localStorage.setItem).toHaveBeenLastCalledWith(
      LOCALE_STORAGE_KEY,
      "en"
    );
  });
});
