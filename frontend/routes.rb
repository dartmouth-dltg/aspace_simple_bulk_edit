ArchivesSpace::Application.routes.draw do
  match('/plugins/dartmouth_bulk_container_update/update' => 'dartmouth_bulk_container_updates#update', :via => [:post])
  match('/plugins/dartmouth_bulk_container_update/summary' => 'dartmouth_bulk_container_updates#summary', :via => [:post])

end
