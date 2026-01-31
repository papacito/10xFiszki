 # PRD — MVP Generator Fiszek z AI (Spaced Repetition)
 
 ## 1. Cel dokumentu
 Zdefiniowanie wymagań dla MVP, które redukuje tarcie poznawcze podczas tworzenia fiszek i pozwala uczniom liceum szybko generować wysokiej jakości fiszki z notatek.
 
 ## 2. Problem użytkownika
 Uczniowie liceum chcą uczyć się metodą spaced repetition, ale ręczne tworzenie fiszek jest czasochłonne i męczące poznawczo. Skutkiem jest odkładanie nauki, niska jakość fiszek i brak regularnych powtórek. Produkt rozwiązuje tarcie na etapie tworzenia fiszek, nie samego algorytmu powtórek.
 
 ## 3. Grupa docelowa
 - Uczniowie liceum
 - Źródło treści: notatki
 - Długość tekstu wejściowego: maksymalnie jedna strona
 
 ## 4. Zakres MVP
 
 ### 4.1. Generowanie fiszek z AI (core)
 - Wejście: tekst z notatek (kopiuj–wklej), do jednej strony
 - Wyjście: lista propozycji fiszek generowanych przez AI
 - Prezentacja: każda fiszka osobno
 
 #### Kontrakt jakości (prompt-level)
 - 1 fakt = 1 fiszka
 - Odpowiedzi krótkie i jednoznaczne
 - Brak pytań wielokrotnych (np. "wymień", "opisz", "porównaj")
 - Preferowane typy:
   - definicje
   - relacje
   - przyczyna → skutek
   - pojęcie → przykład
 
 ### 4.2. Jawny flow akceptacji (krytyczne)
 Każda fiszka AI przechodzi przez decyzję użytkownika:
 - Akceptuj → zapis fiszki
 - Edytuj → minimalny edytor, zapis po modyfikacji
 - Odrzuć → usunięcie fiszki
 
 Decyzja użytkownika jest jawna i rejestrowana.
 
 ### 4.3. Manualne tworzenie fiszek
 - Ręczne dodanie fiszki (przód/tył)
 - Identyczny model danych jak dla fiszek AI
 
 ### 4.4. Zarządzanie fiszkami
 - Lista fiszek
 - Edycja
 - Usuwanie
 
 Bez:
 - tagów
 - folderów
 - współdzielenia
 
 ### 4.5. System kont użytkowników
 - Konto wymagane do wykonania jakiejkolwiek akcji
 - Konto służy wyłącznie do:
   - przechowywania fiszek
   - przechowywania historii powtórek
 
 ### 4.6. Spaced Repetition
 - Integracja z gotowym, otwartym i typowym algorytmem SRS (np. SM-2)
 - Brak własnych modyfikacji algorytmu
 - Jasna komunikacja: "używamy sprawdzonego algorytmu powtórek"
 
 ## 5. Poza zakresem MVP
 - Własny algorytm powtórek (Anki/SuperMemo-level)
 - Import PDF/DOCX/EPUB
 - Współdzielenie zestawów
 - Aplikacje mobilne
 - Gamifikacja
 - Zaawansowane statystyki
 
 ## 6. Kluczowy flow użytkownika (happy path)
 1. Użytkownik loguje się
 2. Wkleja tekst z notatek (max jedna strona)
 3. AI generuje propozycje fiszek
 4. Użytkownik akceptuje / edytuje / odrzuca fiszki
 5. Zapisane fiszki trafiają do systemu powtórek
 6. Użytkownik wykonuje pierwszą sesję SRS
 
 ## 7. Wymagania funkcjonalne
 - Generowanie fiszek z wklejanego tekstu
 - Minimalny edytor fiszek
 - Rejestrowanie decyzji: akceptuj/edytuj/odrzuć
 - Manualne tworzenie fiszek
 - CRUD fiszek
 - System kont (obowiązkowy)
 - SRS z gotowym algorytmem
 
 ### 7.1. User stories
 - Jako uczeń liceum chcę założyć konto i zalogować się, aby móc korzystać z aplikacji.
 - Jako uczeń liceum chcę wkleić notatki (max jedna strona), aby wygenerować propozycje fiszek.
 - Jako uczeń liceum chcę zobaczyć każdą fiszkę osobno, aby łatwo ocenić jej jakość.
 - Jako uczeń liceum chcę zaakceptować fiszkę, aby zapisać ją do powtórek.
 - Jako uczeń liceum chcę edytować fiszkę w minimalnym edytorze, aby poprawić treść przed zapisem.
 - Jako uczeń liceum chcę odrzucić fiszkę, aby usunąć niepotrzebną propozycję.
 - Jako uczeń liceum chcę dodać fiszkę ręcznie, aby uwzględnić treści bez AI.
 - Jako uczeń liceum chcę przeglądać listę fiszek, aby zarządzać swoim materiałem.
 - Jako uczeń liceum chcę edytować i usuwać fiszki, aby utrzymać ich jakość.
 - Jako uczeń liceum chcę rozpocząć sesję SRS, aby wykonać pierwsze powtórki.
 
 ## 8. Wymagania niefunkcjonalne
 - Prosty, szybki UX bez zbędnych kroków
 - Stabilność i przewidywalność generacji
 - Skala MVP, niskie koszty operacyjne
 
 ## 9. Kryteria sukcesu MVP
 
 ### Produktowe
 - ≥ 75% fiszek wygenerowanych przez AI jest akceptowanych
 - ≥ 75% wszystkich fiszek tworzonych jest z użyciem AI
 - ≥ 60% użytkowników, którzy wygenerują fiszki, przechodzi pierwszą sesję powtórek
 
 ### Jakościowe
 - Użytkownicy deklarują oszczędność czasu względem manualnego tworzenia fiszek
 - Użytkownicy nie czują utraty kontroli nad materiałem
 
 ### Analizy i metryki (najprostszy wariant)
 - Eventy: `generate`, `accept`, `edit`, `reject`, `create_manual`, `start_srs`, `complete_srs`
 - Dashboard minimalny: 3 podstawowe wskaźniki (accept rate, AI share, first SRS rate)
 
 ## 10. Założenia i ograniczenia
 - Brak wymagań prywatności na poziomie MVP poza standardowym przechowywaniem danych
 - Brak szczegółowej analizy ryzyk w MVP
 - Szybka realizacja przy minimalnych zasobach
 
 ## 11. Harmonogram i zasoby (wysoki poziom)
 - Priorytet: szybkie dostarczenie MVP
 - Minimalny zespół i prosta architektura
 - Kolejność: konta → generowanie → akceptacja/edycja → SRS → analityka
