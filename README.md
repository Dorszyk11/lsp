WYZWANIE
Każdy pojazd posiada roczny limit przebiegu 150 000 km (z umowy serwisowej). Przekroczenie generuje dodatkowy koszt (x PLN/km). Pojazdy odbierane w różnych terminach po 12 miesiącach muszą możliwie dokładnie trafić w swój limit.

Cel: Rotować pojazdy między trasami, utrzymując limity i minimalizując koszty — przy ograniczeniu do maksymalnie 1 zamiany/pojazd/3 miesiące.

MISJA
W 24h zbudujcie prototyp inteligentnego planera floty, który potrafi:

przewidywać przebiegi na podstawie tras i dotychczasowych przebiegów,
wyznaczać optymalny plan przypisań i zamian pojazdów,
monitorować stan licznika, serwisy i limity leasingowe,
minimalizować dodatkowe koszty przy 100% realizacji tras.
Dlaczego warto?
Realny case — decyzje → konkretne koszty (€ / PLN: nadprzebieg, serwis, przestój, zamiana).
End-to-end w 24h: prognoza → plan → dashboard (Gantt/KPI/alerty) → demo.
Pełna swoboda metod: reguły, arkusze, algorytmy, ML/AI — liczy się skuteczność i zrozumiałość.

2
Dane wejściowe
Struktura danych: dwa zbiory (12 mies.): historyczny do analizy i testowy (harmonogram tras do obsadzenia).

Zbiór historyczny (12 miesięcy): Służy do analizy i zrozumienia charakterystyki operacji (np. które lokalizacje są najpopularniejszymi punktami startowymi, jakie są typowe długości tras).
Zbiór testowy (12 miesięcy): To jest harmonogram przyszłych tras, które Wasz system musi obsadzić. Wasz algorytm będzie oceniany na podstawie tego, jak efektywnie poradzi sobie z przypisaniem pojazdów do tras z tego właśnie zbioru.
Vehicles.csv
Column Type
Id INT
registration_number NVARCHAR(32)
brand NVARCHAR(100)
service_interval_km INT
Leasing_start_km INT
leasing_limit_km INT
leasing_start_date DATETIME
leasing_end_date DATETIME
current_odometer_km INT
Current_location_id ID

Locations.csv
Column Type
id INT
name NVARCHAR(64)
lat DECIMAL(9,6)
long DECIMAL(9,6)
is_hub BIT

Locations_relations.csv
Column Type
id INT
id_loc_1 INT
id_loc_2 INT
dist DECIMAL(10,3)
time DECIMAL(10,2)

Routes.csv & Segments.csv
Routes.csv Type
id INT IDENTITY(1,1)
start_datetime DATETIME2(0)
end_datetime DATETIME2(0)
Segments.csv Type
id INT
route_id INT
seq INT
start_loc_id / end_loc_id INT
start_datetime / end_datetime DATETIME
distance_travelled_km INT
relation_id INT

3
Ograniczenia i reguły (constraints)
3.1 Twarde (feasibility)
Trasy stałe – czas/przebieg narzucony przez klienta.
Brak podwójnych przydziałów – jeden pojazd ≠ dwie trasy równocześnie.
Limit częstotliwości zamian – max 1 zamiana/pojazd/3 miesiące. (Przez "zamianę" w kontekście tego limitu rozumiemy każdy przejazd dojazdowy, czyli sytuację, w której pojazd musi przemieścić się z miejsca zakończenia poprzedniej trasy do miejsca rozpoczęcia nowej trasy. Jeśli pojazd kończy trasę w lokalizacji A i zaczyna następną w tej samej lokalizacji A, nie jest to "zamiana". Każdy przejazd A -> B w celu podjęcia nowej trasy jest liczony jako jedna zamiana. Okres 3 miesięcy jest liczony krocząco.)
Interwały serwisów i limity kontraktowe
Limity roczne — zgodnie z CSV per pojazd; przekroczenia dozwolone z kosztem (nad przebieg)
Serwis musi zostać wykonany po trasie która przekroczy limit kilometrów i „blokuje” pojazd na 48h (w dowolnej lokalizacji).
Pojazdy na początek nie mają przypisanej początkowej lokalizacji (Waszym pierwszym zadaniem jest zaproponowanie początkowego rozmieszczenia floty. W pliku Vehicles.csv dla zbioru testowego, kolumna Current_location_id będzie pusta. Na podstawie analizy danych historycznych musicie zdecydować, w których lokalizacjach umieścić pojazdy na starcie symulacji, aby zminimalizować przyszłe koszty.)
3.3 Koszty
Przejazd dojazdowy / Zamiana: 1000 PLN + 1 PLN/km + 150 PLN/h.
Nadprzebieg: 0,92 PLN/km.
3.4 Interwały i limity
Marka Rodzaj Interwał przeglądowy (km) Limit przebiegu kontraktowego (km)
DAF Ciągnik siodłowy 120 000 450 000
Scania Ciągnik siodłowy 120 000 750 000
Volvo Ciągnik siodłowy 110 000 450 000
Roczne limity: w drugim zbiorze CSV limity roczne są określone per pojazd (np. 150 000 lub 163 200 km/rok). Planner musi respektować oba poziomy: limit roczny (kara = nad przebieg) oraz kontraktowy łączny (km przez cały okres), a także interwały przeglądowe między serwisami.

4
Funkcja celu i KPI
Główny cel optymalizacji: Wasz system będzie oceniany przede wszystkim na podstawie minimalizacji sumy kosztów dodatkowych (koszty przejazdów dojazdowych + kary za nad przebiegi) wygenerowanych podczas obsługi nowego harmonogramu testowego. Efektywne zarządzanie rocznymi limitami przebiegu jest kluczowym elementem strategii prowadzącej do osiągnięcia tego celu.

4.1 KPI (raportowane)
% pojazdów bez przekroczeń limitów,
liczba zamian,
szacowany czas do osiągnięcia limitu (km),
% wykorzystania kontraktów (km przejechane / km dostępne).

5
Output
Propozycja przypisań na podstawie dostarczonych tras,
Raport dodatkowych kosztów: zamiany i dodatkowe kilometry,
Alerty: przekroczenia limitów, konflikty okien, zbliżające się serwisy,
Panel zmian: historia aktualizacji i wpływ na rekomendacje.
6
Bonusowe punkty
Interaktywna predykcja wizualizacja
Responsywny system
Rzeczywista lokalizacja pojazdów
Prognoza na najbliższy rok na bazie danych historycznych

Serwisy mogą być wykonywane w widełkach 1000+- km.
Po zakończeniu leasingu w samochodzie resetowany jest licznik i data leasingu (nowy pojazd limity te same).
Pojazdy, które mają ponad 200 000 km limitu leasingu np 450 000 km to limit w całym okresie leasingu nie na rok.
Limit zmian pojazdów na trzy miesiące jest elastyczny, jeśli okaże się, że bardziej optymalnym rozwiązaniem jest przesunięcie tego limitu na przykładowo jedną zmianę na dwa miesiące - jest to dozwolone Trzeba to jasno określić i limit musi być edytowalnym parametrem przy zmianie.
Wszystkie trasy muszą być zrealizowane - nie można rezygnować z tras.
Ważne jest aby zachowywać historię zmian pojazdów lokacji.
Wynikiem końcowem jest pokazanie jak system radzi sobie z adaptacją do danych testowych które są dostarczane do systemu jako harmonogram tygodniowy lub miesięczny.
seq w tabeli segments oznacza po prostu numer odcinka w trasie.
Nie wszytskie trasy są w pętli.
Trasy mogą się odbywać z dowolnego punktu i kończyć w dowolnym punkcie.
Zaminany pojazdów polegają na zamianie lokalizacji pojazdu (W lokalizacji z której zaczyna się trasa musi być pojazd).
Koszt zamiany pojazdu wyliczamuy z tabeli locations_relations (oprócz tego do pojazdu dodajemy distance).
konflikt okien/ okno konfliktów (Do własnej interpretacji) - Alerty są przykładowe możliwe że po waszych obliczeniach będzieci emogli pokazać lepsze/ciekawsze statystyki czy informacje.
current odometer w vehicles wskazuje na stan licznika w dniu 01.01.2024 o godz 00.00

z pliku routes.csv analiza wsteczna do 50536,2024-12-31 00:00:00,2024-12-31 06:40:48,274.374
i przypisanie tirów do tras od 50537,2025-01-01 00:00:00,2025-01-01 03:56:39,104.962 do końca
