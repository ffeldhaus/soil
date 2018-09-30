Rails.application.routes.draw do
  # load Soil Web App on root
  root 'soil#index'

  # Authenticate players, supervisors and admins
  post 'auth/login', to: 'authenticate#login'

  resources :game
  resources :player
  resources :round
  resources :field
  resources :parcel

  # redirect all unmatched GET requests to root
  get '*path', to: redirect('/')
end