# Deadlock Simulator

Website simulasi metode Deadlock Prevention, Avoidance, dan Detection.

## Cara menjalankan
1. Ekstrak folder `deadlock_simulator_web`.
2. Buka `index.html` menggunakan Google Chrome, Edge, atau Firefox.
3. Tidak perlu instal Python atau server untuk menjalankan versi ini.
4. Untuk mengedit, buka folder ini melalui Visual Studio Code.

## Fitur
- Dashboard dan navigasi sidebar responsif.
- Input jumlah resource, Allocation, Maximum, dan Request.
- Prevention menggunakan aturan resource ordering untuk menghindari circular wait.
- Avoidance menggunakan Banker's Algorithm dan menampilkan safe sequence.
- Detection menggunakan algoritma deteksi berbasis Available, Allocation, dan Request.
- Halaman Comparison untuk merangkum hasil metode.

## Catatan akademik
- Prevention di sini mendemonstrasikan salah satu strategi pencegahan, yaitu resource ordering (urutan global resource), bukan seluruh variasi teknik prevention.
- Avoidance memakai matriks Maximum untuk menghitung Need = Maximum - Allocation.
- Detection memakai matriks Request yang sedang diminta. Pastikan input Request merepresentasikan permintaan yang masih tertunda.
- Data contoh disediakan agar aplikasi dapat langsung dicoba. Ubah data di halaman Input Data untuk menguji skenario lain.

## Struktur file
- `index.html` : struktur halaman
- `style.css` : desain dan responsivitas
- `script.js` : navigasi dan algoritma simulasi

Font Google dan Chart.js tidak wajib untuk fungsi inti; tampilan menggunakan font fallback jika internet tidak tersedia.
